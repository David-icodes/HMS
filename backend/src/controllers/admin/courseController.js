const mongoose = require('mongoose');
const Patient = require('../../models/Patient');
const Course = require('../../models/Course');
const Visit = require('../../models/Visit');
const PaymentTransaction = require('../../models/PaymentTransaction');
const PaymentMethod = require('../../models/PaymentMethod');
const ApiError = require('../../utils/ApiError');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const billing = require('../../utils/billing');

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Returns a finite non-negative number or throws for invalid money input.
const money = (label, value) => {
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(value);
  if (!Number.isFinite(n)) throw new ApiError(400, `${label} must be a valid number`);
  if (n < 0) throw new ApiError(400, `${label} cannot be negative`);
  return round2(n);
};

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
  const viaName = await PaymentMethod.findOne({
    name: new RegExp('^' + String(method).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', 'i'),
  });
  if (viaName) return { id: viaName._id, name: viaName.name };
  return { id: null, name: String(method) || null };
};

// Total billed for a course = package amount + explicit additional charges.
const courseBilled = (course) => round2((course.courseAmount || 0) + (course.additionalCharges || 0));

// Recompute a course's paid/due from the authoritative PaymentTransaction ledger.
const refreshCourseLedger = async (course, userId) => {
  const agg = await PaymentTransaction.aggregate([
    { $match: { courseId: course._id } },
    { $group: { _id: null, paid: { $sum: '$amount' } } },
  ]);
  const paid = round2(agg[0]?.paid || 0);
  course.paid = paid;
  course.due = Math.max(0, round2(courseBilled(course) - paid));
  await course.save();
  return { paid, due: course.due };
};

const findPatient = async (id) => {
  if (!mongoose.isValidObjectId(id)) throw new ApiError(400, 'Invalid patient id');
  const patient = await Patient.findById(id);
  if (!patient) throw new ApiError(404, 'Patient not found');
  return patient;
};

// ---------- Create course + first (day-1) visit + ONE billing + ONE payment ----------
// Accepts an existing patientId OR new-patient details (name/mobile/...) which are
// created/reused here — never duplicated by mobile.
const createCourse = asyncHandler(async (req, res) => {
  const b = req.body;
  let patient;
  if (b.patientId || b.patient) {
    patient = await findPatient(b.patientId || b.patient);
  } else {
    if (!b.name?.trim() || !b.mobile?.trim()) throw new ApiError(400, 'Patient name and mobile are required');
    const mobile = String(b.mobile).trim();
    patient = await Patient.findOne({ mobile });
    if (patient) {
      const patch = {};
      if (b.address && !patient.address) patch.address = String(b.address).trim();
      if (patch.address) await Patient.updateOne({ _id: patient._id }, { $set: patch });
    } else {
      patient = await Patient.create({
        name: String(b.name).trim(),
        mobile,
        age: b.age !== undefined && b.age !== null && b.age !== '' ? Number(b.age) : undefined,
        gender: b.gender || 'Male',
        fN: b.fN || '',
        address: b.address?.trim() || undefined,
        createdBy: req.user._id,
      });
    }
  }

  if (!b.branch) throw new ApiError(400, 'Branch is required.');
  if (!b.department) throw new ApiError(400, 'Department is required.');
  if (!b.doctor) throw new ApiError(400, 'Doctor is required.');
  if (!b.signature?.trim()) throw new ApiError(400, 'Doctor / Staff signature is required.');

  const existing = await Course.findOne({ patient: patient._id, status: 'Active' });
  if (existing) throw new ApiError(409, `Patient already has an active course (${existing.courseNo})`);

  const totalDays = Math.max(1, Math.floor(Number(b.totalDays) || 1));
  if (!Number.isFinite(Number(b.totalDays))) throw new ApiError(400, 'Total days must be a valid number');

  const courseAmount = money('Course amount', b.courseAmount);
  const firstPayment = money('First payment', b.firstPayment);

  const start = b.startDate || b.visitDate || new Date();
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) throw new ApiError(400, 'Invalid course start date');
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + totalDays - 1);

  const method = await resolvePaymentMethod(b.paymentMethod || b.method);

  const course = await Course.create({
    patient: patient._id,
    patientName: patient.name,
    treatment: b.treatment?.trim() || undefined,
    branch: b.branch || undefined,
    department: b.department || undefined,
    doctor: b.doctor || undefined,
    totalDays,
    dayNumber: 1,
    startDate,
    endDate,
    courseAmount,
    additionalCharges: 0,
    paid: firstPayment,
    due: Math.max(0, round2(courseAmount - firstPayment)),
    status: 'Active',
    notes: b.notes?.trim() || undefined,
    createdBy: req.user._id,
  });

  // Day-1 visit carries the single course billing event. Follow-ups add ₹0.
  const visit = await Visit.create({
    patient: patient._id,
    uhid: patient.uhid,
    visitDate: startDate,
    visitType: 'New OP',
    branch: b.branch || undefined,
    department: b.department || undefined,
    doctor: b.doctor || undefined,
    diagnosis: b.diagnosis?.trim() || undefined,
    treatment: b.treatment?.trim() || undefined,
    noOfDays: totalDays,
    notes: b.notes?.trim() || undefined,
    charges: {
      opConsultation: 0,
      pharmacy: 0,
      lab: 0,
      otherCharges: courseAmount,
      discount: 0,
      tax: 0,
      total: courseAmount,
    },
    payment: {
      advanced: firstPayment,
      method: method.id,
      methodName: method.name,
      due: Math.max(0, round2(courseAmount - firstPayment)),
      status: billing.computePayment(courseAmount, firstPayment).status,
    },
    createdBy: req.user._id,
    signature: b.signature?.trim() || undefined,
    courseId: course._id,
    dayNumber: 1,
    totalDays,
  });

  let payment = null;
  if (firstPayment > 0) {
    payment = await PaymentTransaction.create({
      patientId: patient._id,
      courseId: course._id,
      visitId: visit._id,
      amount: firstPayment,
      paymentMethod: method.name || undefined,
      paymentMethodId: method.id,
      paymentDate: startDate,
      branchId: b.branch || undefined,
      note: 'Course day-1 payment',
      createdBy: req.user._id,
    });
  }

  await course.save();
  const full = await Course.findById(course._id)
    .populate('branch', 'name')
    .populate('department', 'name')
    .populate('doctor', 'name')
    .populate('patient', 'uhid name mobile');

  res.status(201).json(
    new ApiResponse(201, { course: full, visit, payment }, `Course ${full.courseNo} created`)
  );
});

// ---------- Get the patient's active course (with its visits) ----------
const getActiveCourse = asyncHandler(async (req, res) => {
  const { patient } = req.query;
  if (!patient || !mongoose.isValidObjectId(patient)) throw new ApiError(400, 'Patient id is required');
  const course = await Course.findOne({ patient, status: 'Active' }).sort({ createdAt: -1 })
    .populate('branch', 'name')
    .populate('department', 'name')
    .populate('doctor', 'name')
    .populate('patient', 'uhid name mobile');
  if (!course) {
    return res.status(200).json(new ApiResponse(200, { course: null, visits: [] }));
  }
  const visits = await Visit.find({ courseId: course._id })
    .sort({ dayNumber: 1, visitDate: 1 })
    .populate('branch', 'name')
    .populate('department', 'name')
    .populate('doctor', 'name');
  res.status(200).json(new ApiResponse(200, { course, visits, billed: courseBilled(course) }));
});

const getCourse = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid course id');
  const course = await Course.findById(req.params.id)
    .populate('branch', 'name')
    .populate('department', 'name')
    .populate('doctor', 'name')
    .populate('patient', 'uhid name mobile');
  if (!course) throw new ApiError(404, 'Course not found');
  res.status(200).json(new ApiResponse(200, course));
});

// ---------- List a course's visits ----------
const listCourseVisits = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid course id');
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, 'Course not found');
  const visits = await Visit.find({ courseId: course._id })
    .sort({ dayNumber: 1, visitDate: 1 })
    .populate('branch', 'name')
    .populate('department', 'name')
    .populate('doctor', 'name')
    .populate('createdBy', 'name');
  res.status(200).json(new ApiResponse(200, { course, visits }));
});

// ---------- Add a follow-up visit (₹0 billing unless an explicit additional charge) ----------
const addFollowUp = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid course id');
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, 'Course not found');
  if (course.status !== 'Active') throw new ApiError(400, 'Course is not active');

  const b = req.body;
  const visitCount = await Visit.countDocuments({ courseId: course._id });
  const nextDay = visitCount + 1;
  if (nextDay > course.totalDays) {
    throw new ApiError(400, `Course has already completed all ${course.totalDays} days`);
  }

  const additionalCharge = money('Additional charge', b.additionalCharge);
  const method = await resolvePaymentMethod(b.paymentMethod || b.method);
  const visitDate = b.visitDate ? new Date(b.visitDate) : new Date();
  if (Number.isNaN(visitDate.getTime())) throw new ApiError(400, 'Invalid visit date');

  const visit = await Visit.create({
    patient: course.patient,
    courseId: course._id,
    dayNumber: nextDay,
    totalDays: course.totalDays,
    visitDate,
    visitType: 'Follow-up',
    branch: b.branch || course.branch,
    department: b.department || course.department,
    doctor: b.doctor || course.doctor,
    diagnosis: b.diagnosis?.trim() || undefined,
    treatment: b.treatment?.trim() || undefined,
    notes: b.notes?.trim() || undefined,
    noOfDays: 1,
    charges: {
      opConsultation: 0,
      pharmacy: 0,
      lab: 0,
      otherCharges: additionalCharge,
      discount: 0,
      tax: 0,
      total: additionalCharge,
    },
    payment: {
      advanced: 0,
      method: method.id,
      methodName: method.name,
      due: additionalCharge,
      status: additionalCharge > 0 ? 'Due' : 'Paid',
    },
    createdBy: req.user._id,
    signature: b.signature?.trim() || undefined,
  });

  if (additionalCharge > 0) {
    course.additionalCharges = round2((course.additionalCharges || 0) + additionalCharge);
  }
  course.dayNumber = nextDay;
  if (nextDay >= course.totalDays) course.status = 'Completed';
  course.due = Math.max(0, round2(courseBilled(course) - (course.paid || 0)));
  await course.save();

  const full = await Course.findById(course._id)
    .populate('branch', 'name')
    .populate('department', 'name')
    .populate('doctor', 'name');
  res.status(201).json(new ApiResponse(201, { course: full, visit }, `Day ${nextDay} follow-up added`));
});

// ---------- Record a course payment (one PaymentTransaction, counted once) ----------
const recordPayment = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid course id');
  const course = await Course.findById(req.params.id);
  if (!course) throw new ApiError(404, 'Course not found');

  const amount = money('Payment amount', req.body.amount);
  if (amount <= 0) throw new ApiError(400, 'Payment amount must be greater than zero');

  const method = await resolvePaymentMethod(req.body.paymentMethod || req.body.method);
  const paymentDate = req.body.paymentDate ? new Date(req.body.paymentDate) : new Date();
  if (Number.isNaN(paymentDate.getTime())) throw new ApiError(400, 'Invalid payment date');

  const payment = await PaymentTransaction.create({
    patientId: course.patient,
    courseId: course._id,
    amount,
    paymentMethod: method.name || undefined,
    paymentMethodId: method.id,
    paymentDate,
    branchId: req.body.branchId || course.branch,
    note: req.body.note?.trim() || undefined,
    createdBy: req.user._id,
  });

  const { paid, due } = await refreshCourseLedger(course, req.user._id);
  res.status(201).json(new ApiResponse(201, { course: { ...course.toObject(), paid, due }, payment, balance: { paid, due, billed: courseBilled(course) } }, 'Payment recorded'));
});

// ---------- Course balance (billed / paid / due) ----------
const getCourseBalance = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid course id');
  const course = await Course.findById(req.params.id).populate('patient', 'uhid name mobile');
  if (!course) throw new ApiError(404, 'Course not found');

  const agg = await PaymentTransaction.aggregate([
    { $match: { courseId: course._id } },
    { $group: { _id: null, paid: { $sum: '$amount' }, transactions: { $sum: 1 } } },
  ]);
  const paid = round2(agg[0]?.paid || 0);
  const billed = courseBilled(course);
  const due = Math.max(0, round2(billed - paid));

  res.status(200).json(
    new ApiResponse(200, {
      course,
      billed,
      paid,
      due,
      transactions: agg[0]?.transactions || 0,
      status: course.status,
    })
  );
});

module.exports = {
  createCourse,
  getActiveCourse,
  getCourse,
  listCourseVisits,
  addFollowUp,
  recordPayment,
  getCourseBalance,
};