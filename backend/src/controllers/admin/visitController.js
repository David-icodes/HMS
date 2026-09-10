const mongoose = require('mongoose');
const Patient = require('../../models/Patient');
const Visit = require('../../models/Visit');
const HomeVisit = require('../../models/HomeVisit');
const Course = require('../../models/Course');
const PaymentTransaction = require('../../models/PaymentTransaction');
const PaymentMethod = require('../../models/PaymentMethod');
const Branch = require('../../models/Branch');
const Department = require('../../models/Department');
const Doctor = require('../../models/Doctor');
const Invoice = require('../../models/Invoice');
const { patientIdsByRegistrationBranch } = require('../../utils/registrationBranch');
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

// C/H split helpers. Patients marked Home (free-text, case/space tolerant) are Home;
// everything else (including legacy patients with no cH) counts as Clinic.
const HOME_CH_RE = /^\s*home\s*$/i;
const isHomeCh = (v) => HOME_CH_RE.test(v || '');

const patientResponse = (patient) => {
  const value = patient.toObject ? patient.toObject() : patient;
  return { ...value, id: String(value._id), createdAt: value.createdAt };
};

const homePatientIds = async () => {
  const ids = await Patient.distinct('_id', { cH: HOME_CH_RE });
  return ids.map(String);
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

  let patients = await Patient.find({ $or: or, isArchived: { $ne: true } }).sort({ createdAt: -1 }).limit(20);

  // If matched by OP number only, nurses it through OP-bearing visits.
  if (patients.length === 0) {
    const opVisits = await Visit.find({ opNumber: new RegExp(term, 'i') })
      .select('patient')
      .limit(20)
      .lean();
    const ids = [...new Set(opVisits.map((v) => v.patient))]
      .filter((id) => mongoose.Types.ObjectId.isValid(id));
    if (ids.length) {
      patients = await Patient.find({ _id: { $in: ids }, isArchived: { $ne: true } }).sort({ createdAt: -1 });
    }
  }

  const out = await Promise.all(
    patients.map(async (p) => {
      const [visits, outstandingAgg, activeCourse] = await Promise.all([
        Visit.find({ patient: p._id }).sort({ visitDate: -1 }).limit(5).select('visitDate visitType department doctor opNumber charges payment diagnosis'),
        Visit.aggregate([
          { $match: { patient: p._id, 'payment.status': { $in: ['Due', 'Partial'] } } },
          { $group: { _id: null, due: { $sum: '$payment.due' } } },
        ]),
        Course.findOne({ patient: p._id, status: 'Active' })
          .sort({ createdAt: -1 })
          .populate('department', 'name')
          .populate('doctor', 'name')
          .select('courseNo status totalDays dayNumber courseAmount paid due treatment'),
      ]);
      return {
        ...p.toObject(),
        lastVisit: visits[0] || null,
        visitCount: await Visit.countDocuments({ patient: p._id }),
        outstanding: outstandingAgg[0]?.due || 0,
        activeCourse,
      };
    })
  );

  res.status(200).json(new ApiResponse(200, out));
});

// ---------- Create patient (+ optional first visit) ----------
const createPatient = asyncHandler(async (req, res) => {
  const { name, mobile, age, gender, cH, fN, address } = req.body.patient || req.body;
  if (!name || !mobile) throw new ApiError(400, 'Patient name and mobile are required');

  const submissionId = typeof req.body.submissionId === 'string' ? req.body.submissionId.trim() : '';
  if (submissionId) {
    const replayedVisit = await Visit.findOne({ submissionId }).sort({ createdAt: -1 });
    if (replayedVisit) {
      const replayedPatient = await Patient.findById(replayedVisit.patient);
      if (!replayedPatient) throw new ApiError(409, 'Registration replay could not find its patient');
      return res.status(200).json(new ApiResponse(200, {
        patient: patientResponse(replayedPatient), visit: replayedVisit, isNew: false, invoice: replayedVisit.invoiceNumber || null,
      }, 'Registration already saved'));
    }
  }

  const normalizedName = String(name).trim();
  const normalizedMobile = String(mobile).trim();

  const requestedPatientId = req.body.patientId;
  let patient = null;
  let isNew = false;
  let createdNew = false;
  if (requestedPatientId) {
    // Reuse is allowed only when staff explicitly selected a profile. A
    // matching mobile number never selects or overwrites an earlier entry.
    if (!mongoose.isValidObjectId(requestedPatientId)) throw new ApiError(400, 'Invalid selected patient id');
    patient = await Patient.findById(requestedPatientId);
    if (!patient) throw new ApiError(404, 'Selected patient not found');
  } else {
    // This collection is the registration ledger for normal New OP entries:
    // every submission gets an independent record, even with the same mobile.
    patient = await Patient.create({
      name: normalizedName,
      mobile: normalizedMobile,
      age: age !== undefined && age !== null && age !== '' ? Number(age) : undefined,
      gender: gender || 'Male',
      cH: cH || undefined,
      fN: fN || '',
      address: address || undefined,
      createdBy: req.user._id,
      createdByName: req.user.name,
      staffId: req.body.staffId || undefined,
      submissionId: submissionId || undefined,
    });
    isNew = true;
    createdNew = true;
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
    try {
      visit = await createVisitForPatient(patient, req.body, req.user._id, req.user.name, submissionId);
      if (visit.invoiceNumber) invoice = visit.invoiceNumber;
    } catch (err) {
      // A failure creating the visit must not leave a half-registered patient
      // (phantom patient with no visit). Only remove a patient THIS request
      // created; never touch an existing patient used for a follow-up visit.
      if (createdNew) {
        await Patient.deleteOne({ _id: patient._id }).catch(() => {});
        patient = null;
      }
      throw err;
    }
  }

  await logActivity({ req, action: isNew ? 'create_patient' : 'add_visit', entity: 'patient', entityId: patient._id, details: { name: patient.name, uhid: patient.uhid } });

  const savedPatient = await Patient.findById(patient._id);
  if (!savedPatient) throw new ApiError(500, 'Patient save could not be confirmed');
  res.status(201).json(new ApiResponse(201, { patient: patientResponse(savedPatient), visit, isNew, invoice }));
});

// ---------- Add a new visit to an existing patient ----------
const createVisitForPatient = async (patient, body, userId, userName, submissionId) => {
  const visitType = body.visit?.visitType || 'New OP';
  // Required fields for every NEW OP record (spec). Follow-ups inherit from their
  // course/previous visit and only use values provided. Historical records are untouched.
  if (visitType === 'New OP') {
    if (!body.visit?.branch) throw new ApiError(400, 'Branch is required.');
    if (!body.visit?.department) throw new ApiError(400, 'Department is required.');
    if (!body.visit?.doctor) throw new ApiError(400, 'Doctor is required.');
    if (!body.signature?.trim()) throw new ApiError(400, 'Doctor / Staff signature is required.');
  }
  const charges = sanitizeCharges(body.charges || {});
  const previousAdvance = Math.max(0, billing.round2(billing.toNum(body.payment?.previousAdvance)));
  const amountPaid =
    body.payment?.amountPaid !== undefined
      ? Math.max(0, billing.round2(billing.toNum(body.payment.amountPaid)))
      : Math.max(0, billing.round2(billing.toNum(body.payment?.advanced)));
  const applied = billing.round2(previousAdvance + amountPaid);
  const method = await resolvePaymentMethod(body.payment?.method);

  const visit = await Visit.create({
    patient: patient._id,
    uhid: patient.uhid,
    visitDate: body.visit?.visitDate || new Date(),
    visitType,
    branch: body.visit?.branch || undefined,
    department: body.visit?.department || undefined,
    doctor: body.visit?.doctor || undefined,
    referralDoctor: body.visit?.referralDoctor || '',
    concern: body.visit?.concern || undefined,
    diagnosis: body.visit?.diagnosis || undefined,
    treatment: body.visit?.treatment || undefined,
    noOfDays: body.visit?.noOfDays || 0,
    notes: body.visit?.notes || undefined,
    charges: charges,
    payment: {
      previousAdvance,
      advanced: applied,
      method: method.id,
      methodName: method.name,
      due: billing.computePayment(charges.total, applied).due,
      status: billing.computePayment(charges.total, applied).status,
    },
    createdBy: userId,
    createdByName: userName,
    signature: body.signature || undefined,
    staffId: body.staffId || undefined,
    submissionId: submissionId || undefined,
  });
  return visit;
};

const addVisit = asyncHandler(async (req, res) => {
  const patient = await Patient.findById(req.params.id);
  if (!patient) throw new ApiError(404, 'Patient not found');
  const visit = await createVisitForPatient(patient, req.body, req.user._id, req.user.name);
  await logActivity({ req, action: 'create_visit', entity: 'visit', entityId: visit._id, details: { uhid: patient.uhid, op: visit.opNumber } });
  const full = await Visit.findById(visit._id).populate(VISIT_POPULATE);
  res.status(201).json(new ApiResponse(201, { visit: full }));
});

// ---------- List visits (OP list) ----------
const listVisits = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, from, to, branch, department, doctor, status, visitType, ch, sort = '-createdAt' } = req.query;
  const query = {};

  if (search) {
    const term = String(search).trim();
    const Patient = mongoose.model('Patient');
    const patients = await Patient.find({
      isArchived: { $ne: true },
      $or: [{ name: new RegExp(term, 'i') }, { mobile: new RegExp(term, 'i') }, { uhid: new RegExp(term, 'i') }],
    }).select('_id').lean();
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
  if (ch) {
    const term = String(ch).trim().toLowerCase();
    const homeIds = await homePatientIds();
    if (term === 'home') query.patient = { $in: homeIds };
    else if (term === 'clinic') query.patient = { $nin: homeIds };
  }

  // Archived patients are hidden from every patient-facing list. The Patient is
  // soft-deleted (never cascade-cleaned), so their visits must be excluded here
  // to keep the Admin OP list and Staff visits in sync with the deletion.
  const archivedPatientIds = (await Patient.find({ isArchived: true }).select('_id').lean())
    .flatMap((p) => [p._id, String(p._id)]);
  if (archivedPatientIds.length) {
    if (query.patient) {
      if (Array.isArray(query.patient.$in)) {
        query.patient.$in = query.patient.$in.filter((id) => !archivedPatientIds.some((a) => String(a) === String(id)));
      } else if (Array.isArray(query.patient.$nin)) {
        query.patient.$nin = query.patient.$nin.concat(archivedPatientIds);
      } else {
        query.patient = { $nin: [].concat(query.patient, archivedPatientIds) };
      }
    } else {
      query.patient = { $nin: archivedPatientIds };
    }
  }

  const total = await Visit.countDocuments(query);
  const sortKey = sort.replace(/^-/, '');
  const sortDir = sort.startsWith('-') ? -1 : 1;
  const items = await Visit.find(query)
    .sort({ [sortKey]: sortDir, _id: -1 })
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
    const previousAdvance = req.body.payment?.previousAdvance !== undefined ? Number(req.body.payment.previousAdvance) : visit.payment.previousAdvance || 0;
    const method = await resolvePaymentMethod(req.body.payment?.method ?? visit.payment.method);
    const pay = billing.computePayment(charges.total, advanced, method.name);
    visit.charges = charges;
    visit.payment = {
      previousAdvance,
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
      patient.mobile = String(pbody.mobile).trim();
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
    const previousAdvance = req.body.payment?.previousAdvance !== undefined ? Number(req.body.payment.previousAdvance) : visit.payment.previousAdvance || 0;
    const method = await resolvePaymentMethod(req.body.payment?.method ?? visit.payment.method);
    const pay = billing.computePayment(charges.total, advanced, method.name);
    visit.charges = charges;
    visit.payment = {
      previousAdvance,
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
  const sessions = Math.max(1, Number(b.sessions) || 1);
  const total = Math.max(0, billing.round2(perSession * sessions));
  const advance = Math.max(0, Number(b.advance) || 0);
  const due = Math.max(0, billing.round2(total - advance));
  const pay = billing.computePayment(total, advance, b.paymentMethod);
  const hv = await HomeVisit.create({
    patientName: b.patientName,
    diagnosis: b.diagnosis,
    location: b.location,
    timing: b.timing,
    contact: b.contact,
    attendance: b.attendance,
    reason: b.reason,
    perSession,
    sessions,
    total,
    advance,
    due,
    paymentMethod: b.paymentMethod || '',
    paymentStatus: pay.status,
    branch: b.branch || undefined,
    therapist: b.therapist,
    referralDoctor: b.referralDoctor || '',
    staffInTime: b.staffInTime || '',
    staffOutTime: b.staffOutTime || '',
    createdBy: req.user._id,
    staffId: b.staffId || undefined,
  });
  const full = await HomeVisit.findById(hv._id).populate('branch', 'name');
  res.status(201).json(new ApiResponse(201, { homeVisit: full }, 'Home visit created'));
});

const listHomeVisits = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, from, to, branch, therapist, referralDoctor, attendance, sort = '-createdAt' } = req.query;
  const query = {};
  if (search) {
    const term = String(search).trim();
    query.$or = [{ patientName: new RegExp(term, 'i') }, { contact: new RegExp(term, 'i') }, { location: new RegExp(term, 'i') }];
  }
  const range = parseRange(from, to);
  if (range.$gte || range.$lte) query.createdAt = range;
  if (branch) query.branch = branch;
  if (therapist) query.therapist = new RegExp(String(therapist), 'i');
  if (referralDoctor) query.referralDoctor = new RegExp(String(referralDoctor), 'i');
  if (attendance) query.attendance = new RegExp(String(attendance), 'i');

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

const getHomeVisit = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid home visit id');
  const hv = await HomeVisit.findById(req.params.id).populate('branch', 'name').populate('createdBy', 'name');
  if (!hv) throw new ApiError(404, 'Home visit not found');
  res.status(200).json(new ApiResponse(200, hv));
});

// ---------- Generate a Home Visit invoice (printable, home-visit specific) ----------
const generateHomeVisitInvoice = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid home visit id');
  const hv = await HomeVisit.findById(req.params.id).populate('branch', 'name').populate('createdBy', 'name');
  if (!hv) throw new ApiError(404, 'Home visit not found');

  if (!hv.invoiceNumber) {
    const now = new Date();
    const ymd = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const count = await HomeVisit.countDocuments({ invoiceNumber: new RegExp(`^URH-HVINV-${ymd}-`) });
    hv.invoiceNumber = `URH-HVINV-${ymd}-${String(count + 1).padStart(4, '0')}`;
    await hv.save();
  }

  await logActivity({ req, action: 'generate_home_visit_invoice', entity: 'homeVisit', entityId: hv._id, details: { invoiceNumber: hv.invoiceNumber, patient: hv.patientName, total: hv.total } });
  res.status(201).json(new ApiResponse(201, { homeVisit: hv }, 'Home visit invoice generated'));
});

const updateHomeVisit = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid home visit id');
  const hv = await HomeVisit.findById(req.params.id);
  if (!hv) throw new ApiError(404, 'Home visit not found');
  const b = req.body;
  for (const f of ['patientName', 'diagnosis', 'location', 'timing', 'contact', 'attendance', 'reason', 'branch', 'therapist', 'referralDoctor', 'staffInTime', 'staffOutTime', 'paymentMethod']) {
    if (b[f] !== undefined) hv[f] = b[f];
  }
  if (b.perSession !== undefined) hv.perSession = Math.max(0, Number(b.perSession) || 0);
  if (b.sessions !== undefined) hv.sessions = Math.max(1, Number(b.sessions) || 1);
  if (b.advance !== undefined) hv.advance = Math.max(0, Number(b.advance) || 0);
  hv.total = Math.max(0, billing.round2((Number(hv.perSession) || 0) * (Number(hv.sessions) || 1)));
  hv.due = Math.max(0, billing.round2(hv.total - (Number(hv.advance) || 0)));
  const pay = billing.computePayment(hv.total, hv.advance, hv.paymentMethod);
  hv.paymentStatus = pay.status;
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
// Enriches each Patient with lastVisit, visitCount, non-negative outstanding (due),
// total billed, total paid, balance/excess (paid - billed) and their active course.
const buildPatientRows = async (patients) => {
  if (!patients.length) return [];
  const ids = patients.map((p) => p._id);
  const [visits, outstandingAgg, moneyAgg, activeCourses] = await Promise.all([
    Visit.find({ patient: { $in: ids } })
      .sort({ visitDate: -1 })
      .select(
        'patient visitDate visitType branch department doctor opNumber diagnosis treatment noOfDays signature referralDoctor charges payment.advanced payment.due payment.status courseId dayNumber totalDays'
      )
      .populate('branch', 'name')
      .populate('department', 'name')
      .populate('doctor', 'name')
      .lean(),
    Visit.aggregate([
      { $match: { patient: { $in: ids }, 'payment.status': { $in: ['Due', 'Partial'] } } },
      { $group: { _id: '$patient', due: { $sum: '$payment.due' } } },
    ]),
    Visit.aggregate([
      { $match: { patient: { $in: ids } } },
      { $group: { _id: '$patient', billed: { $sum: '$charges.total' }, paid: { $sum: '$payment.advanced' } } },
    ]),
    Course.find({ patient: { $in: ids }, status: 'Active' })
      .sort({ createdAt: -1 })
      .select('patient courseNo totalDays dayNumber courseAmount additionalCharges initialAdvance paid due treatment')
      .lean(),
  ]);
  const dueMap = {};
  outstandingAgg.forEach((r) => {
    dueMap[r._id.toString()] = Math.max(0, r.due || 0);
  });
  const moneyMap = {};
  moneyAgg.forEach((r) => {
    moneyMap[r._id.toString()] = { billed: r.billed || 0, paid: r.paid || 0 };
  });
  const courseMap = {};
  activeCourses.forEach((c) => {
    if (!courseMap[c.patient.toString()]) courseMap[c.patient.toString()] = c;
  });
  const lastByPatient = {};
  const visitCountByPatient = {};
  visits.forEach((v) => {
    const id = v.patient.toString();
    visitCountByPatient[id] = (visitCountByPatient[id] || 0) + 1;
    if (lastByPatient[id] === undefined) lastByPatient[id] = v;
  });
  return patients.map((p) => {
    const id = p._id.toString();
    const last = lastByPatient[id] || null;
    const billingVisit = visits.find((v) => v.patient.toString() === id && v.charges && v.charges.total > 0) || null;
    const money = moneyMap[id] || { billed: 0, paid: 0 };
    const billed = Math.max(0, money.billed);
    const paid = Math.max(0, money.paid);
    return {
      ...p.toObject(),
      lastVisit: last,
      billingVisit,
      visitCount: visitCountByPatient[id] || 0,
      outstanding: dueMap[id] || 0,
      billed,
      paid,
      due: Math.max(0, Math.round((billed - paid) * 100) / 100),
      balance: Math.max(0, Math.round((paid - billed) * 100) / 100),
      activeCourse: courseMap[id] || null,
    };
  });
};

// Staff dashboard patient figures are calculated from persisted registrations,
// never from the dashboard's rendered 4-row preview.
const getStaffDashboard = asyncHandler(async (req, res) => {
  // Today's Patients is ALWAYS the backend/hospital current local day. A
  // client-supplied ?date= is never accepted here: the counter must roll over
  // at the local calendar boundary and cannot be shifted by a stale browser
  // clock or a cached bundle. Historical days stay reachable via the Daily
  // Register / report / patient-list date filters.
  const now = new Date();
  const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const range = parseRange(date, date);
  if (!range.$gte || !range.$lte) throw new ApiError(400, 'Invalid dashboard date');
  // Today's Patients = every patient registration created within the local
  // hospital day (Clinic + Home). Counts come from the Patient collection
  // itself, never from the 4-row preview, so every registration is counted
  // exactly once and course/follow-up/payment activity never inflates them.
  const baseQuery = { isArchived: { $ne: true }, createdAt: range };

  const [total, homeCount, recent] = await Promise.all([
    Patient.countDocuments(baseQuery),
    Patient.countDocuments({ ...baseQuery, cH: HOME_CH_RE }),
    Patient.find(baseQuery)
      .sort({ createdAt: -1, _id: -1 })
      .limit(4)
      .select('uhid name mobile cH createdAt')
      .lean(),
  ]);

  const clinic = total - homeCount;
  res.status(200).json(new ApiResponse(200, {
    date,
    patients: { total, clinic, home: homeCount, recent },
  }));
});

const listMasterPatients = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search, from, to, branch, department, gender, ch, sort = '-createdAt' } = req.query;
  const query = { isArchived: { $ne: true } };
  const range = parseRange(from, to);
  if (range.$gte || range.$lte) query.createdAt = range;
  if (branch) query._id = { $in: await patientIdsByRegistrationBranch(branch) };
  if (department) query._id = { $in: await Visit.distinct('patient', { department }) };
  if (gender) query.gender = gender;
  if (ch) {
    const term = String(ch).trim().toLowerCase();
    if (term === 'home') query.cH = HOME_CH_RE;
    else if (term === 'clinic') query.cH = { $not: HOME_CH_RE };
  }

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
    // Stable ordering keeps a newly saved patient at the top of page one even
    // when two registrations share the same millisecond timestamp.
    .sort({ [sortKey]: sortDir, _id: -1 })
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
  patient.isArchived = true;
  patient.archivedAt = new Date();
  await patient.save();
  // Confirm the archive actually persisted before reporting success, so the UI
  // never shows "deleted" for a record that is still active.
  const persisted = await Patient.findById(patient._id).lean();
  if (!persisted || !persisted.isArchived) throw new ApiError(500, 'Failed to archive patient');
  await logActivity({ req, action: 'archive_patient', entity: 'patient', entityId: patient._id, details: { uhid: patient.uhid, name: patient.name } });
  res.status(200).json(new ApiResponse(200, { deletedId: patient._id, isArchived: true }, 'Patient archived; clinical and financial history was preserved'));
});

// ---------- Export master patients (all matching, for admin) ----------
const exportMasterPatients = asyncHandler(async (req, res) => {
  const { search, from, to, branch, department, gender, ch } = req.query;
  const query = {};
  const range = parseRange(from, to);
  if (range.$gte || range.$lte) query.createdAt = range;
  if (branch) query._id = { $in: await patientIdsByRegistrationBranch(branch) };
  if (department) query._id = { $in: await Visit.distinct('patient', { department }) };
  if (gender) query.gender = gender;
  if (ch) {
    const term = String(ch).trim().toLowerCase();
    if (term === 'home') query.cH = HOME_CH_RE;
    else if (term === 'clinic') query.cH = { $not: HOME_CH_RE };
  }
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
  getHomeVisit,
  updateHomeVisit,
  deleteHomeVisit,
  generateHomeVisitInvoice,
  listMasterPatients,
  getStaffDashboard,
  getMasterPatient,
  updateMasterPatient,
  deleteMasterPatient,
  exportMasterPatients,
};
