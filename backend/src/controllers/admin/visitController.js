const mongoose = require('mongoose');
const Patient = require('../../models/Patient');
const Visit = require('../../models/Visit');
const HomeVisit = require('../../models/HomeVisit');
const PaymentMethod = require('../../models/PaymentMethod');
const Branch = require('../../models/Branch');
const Department = require('../../models/Department');
const Doctor = require('../../models/Doctor');
const Invoice = require('../../models/Invoice');
const ApiError = require('../../utils/ApiError');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const billing = require('../../utils/billing');
const { logActivity } = require('./authController');

const VISIT_POPULATE = [
  { path: 'patient', select: 'uhid name mobile age gender cH fN address' },
  { path: 'branch', select: 'name address area city phone' },
  { path: 'department', select: 'name slug' },
  { path: 'doctor', select: 'name designation' },
  { path: 'payment.method', select: 'name slug' },
  { path: 'createdBy', select: 'name' },
];

const parseRange = (from, to) => {
  const range = {};
  if (from) {
    const d = new Date(from);
    if (!Number.isNaN(d.getTime())) range.$gte = new Date(d.setHours(0, 0, 0, 0));
  }
  if (to) {
    const d = new Date(to);
    if (!Number.isNaN(d.getTime())) range.$lte = new Date(d.setHours(23, 59, 59, 999));
  }
  return range;
};

const sanitizeCharges = (charges) => billing.normalizeCharges(charges || {});

const resolvePaymentMethod = async (method) => {
  if (!method) return { id: null, name: null };
  if (mongoose.isValidObjectId(method)) {
    const pm = await PaymentMethod.findById(method);
    return { id: pm ? pm._id : null, name: pm ? pm.name : null };
  }
  const viaSlug = await PaymentMethod.findOne({
    slug: String(method).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  });
  if (viaSlug) return { id: viaSlug._id, name: viaSlug.name };
  const viaName = await PaymentMethod.findOne({ name: new RegExp('^' + String(method).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i') });
  if (viaName) return { id: viaName._id, name: viaName.name };
  return { id: null, name: String(method) || null };
};

// ---------- Patient search ----------
const searchPatients = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || !String(q).trim()) {
    return res.status(200).json(new ApiResponse(200, []));
  }
  const term = String(q).trim();
  const digits = term.replace(/\D/g, '');
  const or = [
    { name: new RegExp(term, 'i') },
    { uhid: new RegExp(term, 'i') },
    { mobile: new RegExp(term, 'i') },
  ];
  if (digits) or.push({ mobile: new RegExp(digits) });
  const patients = await Patient.find({ $or: or }).sort({ createdAt: -1 }).limit(20);

  const out = await Promise.all(
    patients.map(async (p) => {
      const [visits, outstandingAgg] = await Promise.all([
        Visit.find({ patient: p._id }).sort({ visitDate: -1 }).limit(5).select('visitDate visitType department doctor opNumber charges payment diagnosis'),
        Visit.aggregate([
          { $match: { patient: p._id, 'payment.status': { $in: ['Due', 'Partial'] } } },
          { $group: { _id: null, due: { $sum: '$payment.due' } } },
        ]),
      ]);
      return {
        ...p.toObject(),
        lastVisit: visits[0] || null,
        visitCount: await Visit.countDocuments({ patient: p._id }),
        outstanding: outstandingAgg[0]?.due || 0,
      };
    })
  );

  res.status(200).json(new ApiResponse(200, out));
});

// ---------- Create patient (+ optional first visit) ----------
const createPatient = asyncHandler(async (req, res) => {
  const { name, mobile, age, gender, cH, fN, address } = req.body.patient || req.body;
  if (!name || !mobile) throw new ApiError(400, 'Patient name and mobile are required');

  let patient = await Patient.findOne({ mobile });
  let isNew = false;
  if (patient) {
    // keep existing patient (do not duplicate)
    const patch = {};
    if (address && !patient.address) patch.address = address;
    if (cH && !patient.cH) patch.cH = cH;
    if (patch.address || patch.cH) await Patient.updateOne({ _id: patient._id }, { $set: patch });
  } else {
    patient = await Patient.create({
      name,
      mobile,
      age: age !== undefined && age !== null && age !== '' ? Number(age) : undefined,
      gender: gender || 'Male',
      cH: cH || undefined,
      fN: fN || '',
      address: address || undefined,
      createdBy: req.user._id,
    });
    isNew = true;
  }

  let visit = null;
  let invoice = null;
  const visitBody = req.body.visit || {};
  const hasVisit =
    visitBody.visitType ||
    visitBody.branch ||
    visitBody.department ||
    visitBody.doctor ||
    req.body.charges ||
    req.body.payment;

  if (hasVisit) {
    visit = await createVisitForPatient(patient, req.body, req.user._id);
    if (visit.invoiceNumber) invoice = visit.invoiceNumber;
  }

  await logActivity({ req, action: isNew ? 'create_patient' : 'reuse_patient', entity: 'patient', entityId: patient._id, details: { name: patient.name, uhid: patient.uhid } });

  res.status(201).json(new ApiResponse(201, { patient, visit, isNew, invoice }));
});

// ---------- Add a new visit to an existing patient ----------
const createVisitForPatient = async (patient, body, userId) => {
  const charges = sanitizeCharges(body.charges || {});
  const { advanced, status } = billing.computePayment(charges.total, body.payment?.advanced, body.payment?.methodName);
  const method = await resolvePaymentMethod(body.payment?.method);

  const mergedCharges = { ...charges };
  const visit = await Visit.create({
    patient: patient._id,
    uhid: patient.uhid,
    visitDate: body.visit?.visitDate || new Date(),
    visitType: body.visit?.visitType || 'New OP',
    branch: body.visit?.branch || undefined,
    department: body.visit?.department || undefined,
    doctor: body.visit?.doctor || undefined,
    referralDoctor: body.visit?.referralDoctor || '',
    concern: body.visit?.concern || undefined,
    diagnosis: body.visit?.diagnosis || undefined,
    treatment: body.visit?.treatment || undefined,
    noOfDays: body.visit?.noOfDays || 0,
    notes: body.visit?.notes || undefined,
    charges: mergedCharges,
    payment: {
      advanced,
      method: method.id,
      methodName: method.name,
      due: billing.computePayment(charges.total, advanced).due,
      status,
    },
    createdBy: userId,
    signature: body.signature || undefined,
  });
  return visit;
};

const addVisit = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  if (!patient) throw new ApiError(404, 'Patient not found');
  const visit = await createVisitForPatient(patient, req.body, req.user._id);
  await logActivity({ req, action: 'create_visit', entity: 'visit', entityId: visit._id, details: { uhid: patient.uhid, op: visit.opNumber } });
  const full = await Visit.findById(visit._id).populate(VISIT_POPULATE);
  res.status(201).json(new ApiResponse(201, { visit: full }));
});

// ---------- List visits (OP list) ----------
const listVisits = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, from, to, branch, department, doctor, status, visitType, sort = '-createdAt' } = req.query;
  const query = {};

  if (search) {
    const term = String(search).trim();
    const Patient = mongoose.model('Patient');
    const patients = await Patient.find({ $or: [{ name: new RegExp(term, 'i') }, { mobile: new RegExp(term, 'i') }, { uhid: new RegExp(term, 'i') }] }).select('_id').lean();
    const ids = patients.map((p) => p._id);
    query.$or = [{ patient: { $in: ids } }, { opNumber: new RegExp(term, 'i') }, { uhid: new RegExp(term, 'i') }];
  }
  const range = parseRange(from, to);
  if (range.$gte || range.$lte) query.visitDate = range;
  if (branch) query.branch = branch;
  if (department) query.department = department;
  if (doctor) query.doctor = doctor;
  if (status) query['payment.status'] = status;
  if (visitType) query.visitType = visitType;

  const total = await Visit.countDocuments(query);
  const sortKey = sort.replace(/^-/, '');
  const sortDir = sort.startsWith('-') ? -1 : 1;
  const items = await Visit.find(query)
    .sort({ [sortKey]: sortDir })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .populate(VISIT_POPULATE);

  res.status(200).json(
    new ApiResponse(200, {
      data: items,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.max(1, Math.ceil(total / Number(limit))),
    })
  );
});

// ---------- Get a single visit ----------
const getVisit = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid visit id');
  const visit = await Visit.findById(req.params.id).populate(VISIT_POPULATE);
  if (!visit) throw new ApiError(404, 'Visit not found');
  res.status(200).json(new ApiResponse(200, visit));
});

// ---------- Update a visit (recompute billing server-side) ----------
const updateVisit = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid visit id');
  const visit = await Visit.findById(req.params.id);
  if (!visit) throw new ApiError(404, 'Visit not found');

  const v = req.body.visit || req.body;
  for (const f of ['visitDate', 'visitType', 'branch', 'department', 'doctor', 'referralDoctor', 'concern', 'diagnosis', 'treatment', 'noOfDays', 'notes', 'signature']) {
    if (v[f] !== undefined) visit[f] = v[f];
  }

  if (req.body.charges || req.body.payment) {
    const charges = sanitizeCharges(req.body.charges || visit.charges);
    const advanced = req.body.payment?.advanced !== undefined ? Number(req.body.payment.advanced) : visit.payment.advanced;
    const method = await resolvePaymentMethod(req.body.payment?.method ?? visit.payment.method);
    const pay = billing.computePayment(charges.total, advanced, method.name);
    visit.charges = charges;
    visit.payment = {
      advanced: pay.advanced,
      method: method.id,
      methodName: method.name,
      due: pay.due,
      status: pay.status,
    };
  }

  await visit.save();
  const full = await Visit.findById(visit._id).populate(VISIT_POPULATE);
  await logActivity({ req, action: 'update_visit', entity: 'visit', entityId: visit._id, details: { op: visit.opNumber } });
  res.status(200).json(new ApiResponse(200, { visit: full }, 'Visit updated'));
});

// ---------- Admin: update a specific visit AND its patient (full OP edit) ----------
// Preserves opNumber, uhid, createdBy and created/updated timestamps. Updates only the
// targeted visit document and its linked patient; never creates duplicates.
const adminUpdateVisit = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid visit id');
  const visit = await Visit.findById(req.params.id);
  if (!visit) throw new ApiError(404, 'Visit not found');

  // Patient updates (safe: never regenerate uhid)
  const pbody = req.body.patient || {};
  if (visit.patient) {
    const patient = await Patient.findById(visit.patient);
    if (!patient) throw new ApiError(404, 'Patient not found');
    if (pbody.name !== undefined) patient.name = String(pbody.name).trim();
    if (pbody.mobile !== undefined) {
      const mobile = String(pbody.mobile).trim();
      if (mobile && mobile !== patient.mobile) {
        const dup = await Patient.findOne({ mobile, _id: { $ne: patient._id } });
        if (dup) throw new ApiError(400, 'Another patient already uses this mobile number');
      }
      patient.mobile = mobile;
    }
    if (pbody.age !== undefined) patient.age = pbody.age === '' || pbody.age == null ? null : Number(pbody.age);
    if (pbody.gender !== undefined) patient.gender = pbody.gender;
    if (pbody.cH !== undefined) patient.cH = pbody.cH || '';
    if (pbody.fN !== undefined) patient.fN = pbody.fN || '';
    if (pbody.address !== undefined) patient.address = pbody.address || '';
    await patient.save();
  }

  // Visit updates
  const v = req.body.visit || req.body;
  for (const f of ['visitDate', 'visitType', 'branch', 'department', 'doctor', 'referralDoctor', 'concern', 'diagnosis', 'treatment', 'noOfDays', 'notes', 'signature']) {
    if (v[f] !== undefined) visit[f] = v[f];
  }

  if (req.body.charges || req.body.payment) {
    const charges = sanitizeCharges(req.body.charges || visit.charges);
    const advanced = req.body.payment?.advanced !== undefined ? Number(req.body.payment.advanced) : visit.payment.advanced;
    const method = await resolvePaymentMethod(req.body.payment?.method ?? visit.payment.method);
    const pay = billing.computePayment(charges.total, advanced, method.name);
    visit.charges = charges;
    visit.payment = {
      advanced: pay.advanced,
      method: method.id,
      methodName: method.name,
      due: pay.due,
      status: pay.status,
    };
  }

  await visit.save();
  const full = await Visit.findById(visit._id).populate(VISIT_POPULATE);
  await logActivity({ req, action: 'update_visit', entity: 'visit', entityId: visit._id, details: { op: visit.opNumber } });
  res.status(200).json(new ApiResponse(200, { visit: full }, 'OP updated'));
});

// ---------- Generate invoice for a visit ----------
const generateVisitInvoice = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid visit id');
  const visit = await Visit.findById(req.params.id).populate('branch').populate('department').populate('patient');
  if (!visit) throw new ApiError(404, 'Visit not found');

  const { opConsultation, pharmacy, lab, otherCharges, discount, tax, total } = visit.charges || {};
  const items = [
    { description: 'OP / Consultation', qty: 1, rate: opConsultation || 0, amount: opConsultation || 0 },
    { description: 'Pharmacy', qty: 1, rate: pharmacy || 0, amount: pharmacy || 0 },
    { description: 'Lab', qty: 1, rate: lab || 0, amount: lab || 0 },
    { description: 'Other Charges', qty: 1, rate: otherCharges || 0, amount: otherCharges || 0 },
  ].filter((it) => it.amount > 0);

  const methodName = visit.payment.methodName;
  const invoice = await Invoice.create({
    patient: visit.patient ? visit.patient._id : undefined,
    branch: visit.branch ? visit.branch._id : undefined,
    department: visit.department ? visit.department._id : undefined,
    referralDoctor: visit.referralDoctor || '',
    patientName: visit.patient?.name || visit.patient?.name || '',
    patientMobile: visit.patient?.mobile || '',
    patientAddress: visit.patient?.address,
    opdNumber: visit.opNumber,
    items,
    subtotal: (opConsultation || 0) + (pharmacy || 0) + (lab || 0) + (otherCharges || 0),
    discount: discount || 0,
    tax: tax || 0,
    total,
    amountPaid: visit.payment.advanced,
    paymentMethod: methodName || (visit.payment.method && visit.payment.method.name) || 'pending',
    status: visit.payment.status === 'Paid' ? 'paid' : 'issued',
    issuedBy: req.user._id,
    notes: visit.diagnosis || visit.concern || undefined,
  });

  visit.invoiceNumber = invoice.invoiceNumber;
  await visit.save();

  await logActivity({ req, action: 'generate_invoice', entity: 'invoice', entityId: invoice._id, details: { invoiceNumber: invoice.invoiceNumber, patient: visit.patient?.name, total } });
  const full = await Invoice.findById(invoice._id).populate('branch').populate('department').populate('issuedBy', 'name');
  res.status(201).json(new ApiResponse(201, { invoice: full }, 'Invoice generated'));
});

// ---------- List a patient's visits ----------
const listPatientVisits = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid patient id');
  const patient = await Patient.findById(req.params.id);
  if (!patient) throw new ApiError(404, 'Patient not found');
  const visits = await Visit.find({ patient: patient._id }).sort({ visitDate: -1 }).populate('branch', 'name').populate('department', 'name').populate('doctor', 'name').populate('payment.method', 'name');
  res.status(200).json(new ApiResponse(200, { patient, visits }));
});

// ---------- Patient profile + visits ----------
const getPatient = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid patient id');

  const patient = await Patient.findById(req.params.id);
  if (patient) {
    const [visits, outstandingAgg] = await Promise.all([
      Visit.find({ patient: patient._id }).sort({ visitDate: -1 }).populate('branch', 'name').populate('department', 'name').populate('doctor', 'name'),
      Visit.aggregate([
        { $match: { patient: patient._id, 'payment.status': { $in: ['Due', 'Partial'] } } },
        { $group: { _id: null, due: { $sum: '$payment.due' } } },
      ]),
    ]);
    return res.status(200).json(
      new ApiResponse(200, {
        type: 'patient',
        patient,
        visits,
        outstanding: outstandingAgg[0]?.due || 0,
      })
    );
  }

  // legacy fallback to OpRegistration so existing staff invoice page keeps working
  const OpRegistration = require('../../models/OpRegistration');
  const op = await OpRegistration.findById(req.params.id).populate('branch', 'name address city phone').populate('department', 'name');
  if (!op) throw new ApiError(404, 'Patient not found');
  res.status(200).json(new ApiResponse(200, { type: 'op', op }));
});

// ---------- Home Visits (independent of OP / UHID workflow) ----------
const createHomeVisit = asyncHandler(async (req, res) => {
  const b = req.body;
  if (!b.patientName) throw new ApiError(400, 'Patient name is required');
  const perSession = Math.max(0, Number(b.perSession) || 0);
  const advance = Math.max(0, Number(b.advance) || 0);
  const due = Math.max(0, perSession - advance);
  const hv = await HomeVisit.create({
    patientName: b.patientName,
    diagnosis: b.diagnosis,
    location: b.location,
    timing: b.timing,
    contact: b.contact,
    attendance: b.attendance,
    reason: b.reason,
    perSession,
    advance,
    due,
    branch: b.branch || undefined,
    therapist: b.therapist,
    referralDoctor: b.referralDoctor || '',
    staffInTime: b.staffInTime || '',
    staffOutTime: b.staffOutTime || '',
    createdBy: req.user._id,
  });
  const full = await HomeVisit.findById(hv._id).populate('branch', 'name');
  res.status(201).json(new ApiResponse(201, { homeVisit: full }, 'Home visit created'));
});

const listHomeVisits = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, from, to, branch, therapist, sort = '-createdAt' } = req.query;
  const query = {};
  if (search) {
    const term = String(search).trim();
    query.$or = [{ patientName: new RegExp(term, 'i') }, { contact: new RegExp(term, 'i') }, { location: new RegExp(term, 'i') }];
  }
  const range = parseRange(from, to);
  if (range.$gte || range.$lte) query.createdAt = range;
  if (branch) query.branch = branch;
  if (therapist) query.therapist = new RegExp(String(therapist), 'i');

  const total = await HomeVisit.countDocuments(query);
  const sortKey = sort.replace(/^-/, '');
  const sortDir = sort.startsWith('-') ? -1 : 1;
  const items = await HomeVisit.find(query)
    .sort({ [sortKey]: sortDir })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .populate('branch', 'name');
  res.status(200).json(new ApiResponse(200, { data: items, total, page: Number(page), limit: Number(limit), totalPages: Math.max(1, Math.ceil(total / Number(limit))) }));
});

const updateHomeVisit = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid home visit id');
  const hv = await HomeVisit.findById(req.params.id);
  if (!hv) throw new ApiError(404, 'Home visit not found');
  const b = req.body;
  for (const f of ['patientName', 'diagnosis', 'location', 'timing', 'contact', 'attendance', 'reason', 'branch', 'therapist', 'referralDoctor', 'staffInTime', 'staffOutTime']) {
    if (b[f] !== undefined) hv[f] = b[f];
  }
  if (b.perSession !== undefined || b.advance !== undefined) {
    if (b.perSession !== undefined) hv.perSession = Math.max(0, Number(b.perSession) || 0);
    if (b.advance !== undefined) hv.advance = Math.max(0, Number(b.advance) || 0);
    hv.due = Math.max(0, hv.perSession - hv.advance);
  }
  await hv.save();
  const full = await HomeVisit.findById(hv._id).populate('branch', 'name');
  res.status(200).json(new ApiResponse(200, { homeVisit: full }, 'Home visit updated'));
});

const deleteHomeVisit = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid home visit id');
  const hv = await HomeVisit.findByIdAndDelete(req.params.id);
  if (!hv) throw new ApiError(404, 'Home visit not found');
  res.status(200).json(new ApiResponse(200, null, 'Home visit deleted'));
});

// ---------- Payment methods master (for UI dropdowns) ----------
const listPaymentMethods = asyncHandler(async (req, res) => {
  const methods = await PaymentMethod.find({ isActive: true }).sort({ order: 1, name: 1 });
  res.status(200).json(new ApiResponse(200, methods));
});

// ---------- Unified master patient list (Patient + Visit) ----------
// Enriches each Patient with lastVisit, visitCount and non-negative outstanding balance
// computed from actual Visit billing records.
const buildPatientRows = async (patients) => {
  if (!patients.length) return [];
  const ids = patients.map((p) => p._id);
  const [visits, outstandingAgg] = await Promise.all([
    Visit.find({ patient: { $in: ids } })
      .sort({ visitDate: -1 })
      .select(
        'patient visitDate visitType branch department doctor opNumber diagnosis treatment noOfDays signature referralDoctor charges payment.received payment.advanced payment.due payment.status'
      )
      .populate('branch', 'name')
      .populate('department', 'name')
      .populate('doctor', 'name')
      .lean(),
    Visit.aggregate([
      { $match: { patient: { $in: ids }, 'payment.status': { $in: ['Due', 'Partial'] } } },
      { $group: { _id: '$patient', due: { $sum: '$payment.due' } } },
    ]),
  ]);
  const dueMap = {};
  outstandingAgg.forEach((r) => {
    dueMap[r._id.toString()] = Math.max(0, r.due || 0);
  });
  const lastByPatient = {};
  visits.forEach((v) => {
    if (lastByPatient[v.patient.toString()] === undefined) lastByPatient[v.patient.toString()] = v;
  });
  return patients.map((p) => {
    const id = p._id.toString();
    const last = lastByPatient[id] || null;
    return {
      ...p.toObject(),
      lastVisit: last,
      visitCount: visits.filter((v) => v.patient.toString() === id).length,
      outstanding: dueMap[id] || 0,
    };
  });
};

const listMasterPatients = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, from, to, branch, department, gender, sort = '-createdAt' } = req.query;
  const query = {};
  const range = parseRange(from, to);
  if (range.$gte || range.$lte) query.createdAt = range;
  if (branch) query._id = { $in: await Visit.distinct('patient', { branch }) };
  if (department) query._id = { $in: await Visit.distinct('patient', { department }) };
  if (gender) query.gender = gender;

  if (search) {
    const term = String(search).trim();
    const digits = term.replace(/\D/g, '');
    const or = [{ name: new RegExp(term, 'i') }, { uhid: new RegExp(term, 'i') }, { mobile: new RegExp(term, 'i') }];
    if (digits) or.push({ mobile: new RegExp(digits) });
    query.$and = [{ $or: or }];
  }

  const total = await Patient.countDocuments(query);
  const sortKey = sort.replace(/^-/, '');
  const sortDir = sort.startsWith('-') ? -1 : 1;
  const patients = await Patient.find(query)
    .sort({ [sortKey]: sortDir })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));

  const rows = await buildPatientRows(patients);
  res.status(200).json(
    new ApiResponse(200, {
      data: rows,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.max(1, Math.ceil(total / Number(limit))),
    })
  );
});

// ---------- Single master patient ----------
const getMasterPatient = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid patient id');
  const patient = await Patient.findById(req.params.id);
  if (!patient) throw new ApiError(404, 'Patient not found');
  const [rows] = await buildPatientRows([patient]);
  const visits = await Visit.find({ patient: patient._id })
    .sort({ visitDate: -1 })
    .populate('branch', 'name')
    .populate('department', 'name')
    .populate('doctor', 'name')
    .populate('payment.method', 'name');
  res.status(200).json(new ApiResponse(200, { patient: rows, visits }));
});

// ---------- Update master patient (admin only) ----------
const updateMasterPatient = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid patient id');
  const patient = await Patient.findById(req.params.id);
  if (!patient) throw new ApiError(404, 'Patient not found');
  const b = req.body.patient || req.body;
  if (b.mobile !== undefined && b.mobile !== patient.mobile) {
    const dup = await Patient.findOne({ mobile: b.mobile, _id: { $ne: patient._id } });
    if (dup) throw new ApiError(400, 'Another patient already uses this mobile number');
  }
  for (const f of ['name', 'mobile', 'age', 'gender', 'cH', 'fN', 'address']) {
    if (b[f] !== undefined) patient[f] = b[f];
  }
  if (patient.age !== undefined && patient.age !== null) patient.age = Number(patient.age);
  await patient.save();
  const [row] = await buildPatientRows([patient]);
  await logActivity({ req, action: 'update_patient', entity: 'patient', entityId: patient._id, details: { uhid: patient.uhid, name: patient.name } });
  res.status(200).json(new ApiResponse(200, { patient: row }, 'Patient updated'));
});

// ---------- Delete master patient (admin only) ----------
const deleteMasterPatient = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid patient id');
  const patient = await Patient.findById(req.params.id);
  if (!patient) throw new ApiError(404, 'Patient not found');
  const visits = await Visit.find({ patient: patient._id }).select('opNumber').lean();
  const opNumbers = visits.map((v) => v.opNumber).filter(Boolean);
  await Invoice.deleteMany({ patient: patient._id, opdNumber: { $in: opNumbers } });
  await Invoice.deleteMany({ patient: patient._id, opdNumber: patient.uhid });
  await Visit.deleteMany({ patient: patient._id });
  const uhid = patient.uhid;
  await Patient.deleteOne({ _id: patient._id });
  await logActivity({ req, action: 'delete_patient', entity: 'patient', entityId: patient._id, details: { uhid, name: patient.name } });
  res.status(200).json(new ApiResponse(200, null, 'Patient deleted'));
});

// ---------- Export master patients (all matching, for admin) ----------
const exportMasterPatients = asyncHandler(async (req, res) => {
  const { search, from, to, branch, department, gender } = req.query;
  const query = {};
  const range = parseRange(from, to);
  if (range.$gte || range.$lte) query.createdAt = range;
  if (branch) query._id = { $in: await Visit.distinct('patient', { branch }) };
  if (department) query._id = { $in: await Visit.distinct('patient', { department }) };
  if (gender) query.gender = gender;
  if (search) {
    const term = String(search).trim();
    query.$and = [{ $or: [{ name: new RegExp(term, 'i') }, { uhid: new RegExp(term, 'i') }, { mobile: new RegExp(term, 'i') }] }];
  }
  const patients = await Patient.find(query).sort({ createdAt: -1 }).limit(5000);
  const rows = await buildPatientRows(patients);
  res.status(200).json(new ApiResponse(200, rows));
});

module.exports = {
  listPaymentMethods,
  searchPatients,
  createPatient,
  addVisit,
  listPatientVisits,
  listVisits,
  getVisit,
  updateVisit,
  adminUpdateVisit,
  generateVisitInvoice,
  getPatient,
  createHomeVisit,
  listHomeVisits,
  updateHomeVisit,
  deleteHomeVisit,
  listMasterPatients,
  getMasterPatient,
  updateMasterPatient,
  deleteMasterPatient,
  exportMasterPatients,
};
