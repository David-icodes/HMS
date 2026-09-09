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

// Read-only course ledger (no save): paid / billed / due / balance from the
// PaymentTransaction ledger plus any initial advance already received.
const readCourseLedger = async (course) => {
  const agg = await PaymentTransaction.aggregate([
    { $match: { courseId: course._id } },
    { $group: { _id: null, paid: { $sum: '$amount' } } },
  ]);
  const paid = round2((agg[0]?.paid || 0) + (course.initialAdvance || 0));
  const billed = courseBilled(course);
  return {
    paid,
    billed,
    due: Math.max(0, round2(billed - paid)),
    balance: Math.max(0, round2(paid - billed)),
    initialAdvance: round2(course.initialAdvance || 0),
  };
};

// Recompute a course's paid/due from the authoritative PaymentTransaction ledger plus
// any initial advance already received outside the ledger.
const refreshCourseLedger = async (course, userId) => {
  const agg = await PaymentTransaction.aggregate([
    { $match: { courseId: course._id } },
    { $group: { _id: null, paid: { $sum: '$amount' } } },
  ]);
  const paid = round2((agg[0]?.paid || 0) + (course.initialAdvance || 0));
  course.paid = paid;
  course.due = Math.max(0, round2(courseBilled(course) - paid));
  await course.save();
  return { paid, due: course.due, balance: Math.max(0, round2(paid - courseBilled(course))) };
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
  let createdPatientId = null;
  let createdCourseId = null;
  let createdVisitId = null;
  let createdPaymentId = null;
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
        cH: b.cH || undefined,
        fN: b.fN || '',
        address: b.address?.trim() || undefined,
        createdBy: req.user._id,
        createdByName: req.user.name,
        staffId: b.staffId || b.staff || undefined,
      });
      createdPatientId = patient._id;
    }
  }

  try {
    if (!b.branch) throw new ApiError(400, 'Branch is required.');
    if (!b.department) throw new ApiError(400, 'Department is required.');
    if (!b.doctor) throw new ApiError(400, 'Doctor is required.');
    if (!b.signature?.trim()) throw new ApiError(400, 'Doctor / Staff signature is required.');

    const existing = await Course.findOne({ patient: patient._id, status: 'Active' });
    if (existing) throw new ApiError(409, `Patient already has an active course (${existing.courseNo})`);

  const totalDays = Math.max(1, Math.floor(Number(b.totalDays) || 1));
  if (!Number.isFinite(Number(b.totalDays))) throw new ApiError(400, 'Total days must be a valid number');

  const courseAmount = money('Course amount', b.courseAmount);
  const previousAdvance = money('Previous advance', b.previousAdvance ?? b.initialAdvance);
  const firstPayment = money('First payment', b.firstPayment);

  const start = b.startDate || b.visitDate || new Date();
  const startDate = new Date(start);
  if (Number.isNaN(startDate.getTime())) throw new ApiError(400, 'Invalid course start date');
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + totalDays - 1);

  const method = await resolvePaymentMethod(b.paymentMethod || b.method);

  const applied = round2(previousAdvance + firstPayment);

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
    initialAdvance: previousAdvance,
    paid: applied,
    due: Math.max(0, round2(courseAmount - applied)),
    status: 'Active',
    notes: b.notes?.trim() || undefined,
    createdBy: req.user._id,
    createdByName: req.user.name,
    staffId: b.staffId || b.staff || undefined,
  });
  createdCourseId = course._id;

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
      previousAdvance,
      advanced: applied,
      method: method.id,
      methodName: method.name,
      due: Math.max(0, round2(courseAmount - applied)),
      status: billing.computePayment(courseAmount, applied).status,
    },
    createdBy: req.user._id,
    createdByName: req.user.name,
    signature: b.signature?.trim() || undefined,
    courseId: course._id,
    dayNumber: 1,
    totalDays,
    staffId: b.staffId || b.staff || undefined,
  });
  createdVisitId = visit._id;

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
      staffId: b.staffId || b.staff || undefined,
    });
    createdPaymentId = payment._id;
  }

  await refreshCourseLedger(course, req.user._id);
  const full = await Course.findById(course._id)
    .populate('branch', 'name')
    .populate('department', 'name')
    .populate('doctor', 'name')
    .populate('patient', 'uhid name mobile');

  res.status(201).json(
    new ApiResponse(201, { course: full, visit, payment }, `Course ${full.courseNo} created`)
  );
  } catch (err) {
    // Never report success (or leave the DB in a half-created state) when the
    // course registration chain fails. Roll back ONLY records this request
    // created; never touch an existing patient used for a new course.
    if (createdPaymentId) await PaymentTransaction.deleteOne({ _id: createdPaymentId }).catch(() => {});
    if (createdVisitId) await Visit.deleteOne({ _id: createdVisitId }).catch(() => {});
    if (createdCourseId) await Course.deleteOne({ _id: createdCourseId }).catch(() => {});
    if (createdPatientId && patient && String(patient._id) === String(createdPatientId)) {
      await Patient.deleteOne({ _id: createdPatientId }).catch(() => {});
    }
    throw err;
  }
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
  const ledger = await readCourseLedger(course);
  res.status(200).json(
    new ApiResponse(200, {
      ...course.toObject(),
      billed: ledger.billed,
      paid: ledger.paid,
      due: ledger.due,
      balance: ledger.balance,
      initialAdvance: ledger.initialAdvance,
      visits,
    })
  );
});

const getCourse = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid course id');
  const course = await Course.findById(req.params.id)
    .populate('branch', 'name')
    .populate('department', 'name')
    .populate('doctor', 'name')
    .populate('patient', 'uhid name mobile');
  if (!course) throw new ApiError(404, 'Course not found');
  const ledger = await readCourseLedger(course);
  res.status(200).json(
    new ApiResponse(200, { ...course.toObject(), ...ledger })
  );
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
  const patient = await Patient.findById(course.patient).select('uhid name mobile cH age gender address');
  const payments = await PaymentTransaction.find({ courseId: course._id })
    .sort({ paymentDate: 1, createdAt: 1 })
    .populate('paymentMethodId', 'name')
    .populate('createdBy', 'name');
  const ledger = await readCourseLedger(course);
  res.status(200).json(
    new ApiResponse(200, {
      course: { ...course.toObject(), ...ledger },
      visits,
      patient,
      payments,
      completedDays: visits.length,
    })
  );
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
  const paymentAmount = money('Payment amount', b.paymentAmount);
  const method = await resolvePaymentMethod(b.paymentMethod || b.method);
  if (paymentAmount > 0 && !method.id && !b.paymentMethod && !b.method) {
    throw new ApiError(400, 'Payment method is required when recording a payment');
  }
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
      advanced: paymentAmount,
      method: method.id,
      methodName: method.name,
      due: Math.max(0, round2(additionalCharge - paymentAmount)),
      status:
        paymentAmount > 0
          ? additionalCharge > 0 && paymentAmount < additionalCharge
            ? 'Partial'
            : 'Paid'
          : additionalCharge > 0
            ? 'Due'
            : 'Paid',
    },
    createdBy: req.user._id,
    createdByName: req.user.name,
    signature: b.signature?.trim() || undefined,
    staffId: b.staffId || b.staff || undefined,
  });

  if (additionalCharge > 0) {
    course.additionalCharges = round2((course.additionalCharges || 0) + additionalCharge);
  }
  course.dayNumber = nextDay;
  if (nextDay >= course.totalDays) course.status = 'Completed';

  // Record a payment for this day (one PaymentTransaction, counted once). A
  // follow-up with no money received creates NO transaction and NO revenue.
  let payment = null;
  if (paymentAmount > 0) {
    payment = await PaymentTransaction.create({
      patientId: course.patient,
      courseId: course._id,
      visitId: visit._id,
      amount: paymentAmount,
      paymentMethod: method.name || undefined,
      paymentMethodId: method.id,
      paymentDate: visitDate,
      branchId: b.branch || course.branch,
      note: b.paymentNote?.trim() || undefined,
      createdBy: req.user._id,
      staffId: b.staffId || b.staff || undefined,
    });
  }

  const ledger = await refreshCourseLedger(course, req.user._id);

  const full = await Course.findById(course._id)
    .populate('branch', 'name')
    .populate('department', 'name')
    .populate('doctor', 'name');
  res.status(201).json(
    new ApiResponse(201, { course: full, visit, payment, balance: ledger }, `Day ${nextDay} follow-up added`)
  );
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
    staffId: req.body.staffId || req.body.staff || undefined,
  });

  const ledger = await refreshCourseLedger(course, req.user._id);
  res.status(201).json(new ApiResponse(201, { course: { ...course.toObject(), ...ledger }, payment, balance: ledger }, 'Payment recorded'));
});

// ---------- Course balance (billed / paid / due / balance) ----------
const getCourseBalance = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid course id');
  const course = await Course.findById(req.params.id).populate('patient', 'uhid name mobile');
  if (!course) throw new ApiError(404, 'Course not found');

  const ledger = await readCourseLedger(course);
  const payments = await PaymentTransaction.find({ courseId: course._id })
    .sort({ paymentDate: -1, createdAt: -1 })
    .populate('paymentMethodId', 'name')
    .populate('createdBy', 'name');

  res.status(200).json(
    new ApiResponse(200, {
      course: { ...course.toObject(), ...ledger },
      ...ledger,
      transactions: payments.length,
      status: course.status,
      payments,
    })
  );
});

// ---------- All courses for a patient (follow-up page) ----------
// Returns every course for a patient (active, completed, cancelled) with its
// billed/paid/due (from the PaymentTransaction ledger) and its visits.
const listPatientCourses = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.patientId)) throw new ApiError(400, 'Invalid patient id');
  const patient = await Patient.findById(req.params.patientId).select('uhid name mobile age gender cH fN address');
  if (!patient) throw new ApiError(404, 'Patient not found');

  const courses = await Course.find({ patient: patient._id })
    .sort({ createdAt: -1 })
    .populate('branch', 'name')
    .populate('department', 'name')
    .populate('doctor', 'name');

  const courseIds = courses.map((c) => c._id);
  const visits = await Visit.find({ courseId: { $in: courseIds } })
    .sort({ dayNumber: 1, visitDate: 1 })
    .populate('department', 'name')
    .populate('doctor', 'name');

  const payAgg = await PaymentTransaction.aggregate([
    { $match: { courseId: { $in: courseIds } } },
    { $group: { _id: '$courseId', paid: { $sum: '$amount' }, transactions: { $sum: 1 } } },
  ]);
  const payMap = {};
  payAgg.forEach((p) => (payMap[p._id.toString()] = p));

  const visitsByCourse = {};
  visits.forEach((v) => {
    const k = v.courseId ? v.courseId.toString() : 'none';
    (visitsByCourse[k] = visitsByCourse[k] || []).push(v);
  });

  const rows = courses.map((c) => {
    const paid = round2((payMap[c._id.toString()]?.paid || 0) + (c.initialAdvance || 0));
    const billed = courseBilled(c);
    const due = Math.max(0, round2(billed - paid));
    const balance = Math.max(0, round2(paid - billed));
    return {
      course: {
        ...c.toObject(),
        paid,
        due,
        balance,
        initialAdvance: round2(c.initialAdvance || 0),
      },
      billed,
      paid,
      due,
      balance,
      initialAdvance: round2(c.initialAdvance || 0),
      transactions: payMap[c._id.toString()]?.transactions || 0,
      visits: visitsByCourse[c._id.toString()] || [],
      completedDays: (visitsByCourse[c._id.toString()] || []).length,
    };
  });

  res.status(200).json(new ApiResponse(200, { patient, courses: rows }));
});

// ---------- All active courses across patients (staff follow-up list) ----------
// One row per active course with patient info, ledger and progress.
const listActiveCourses = asyncHandler(async (req, res) => {
  const courses = await Course.find({ status: 'Active' })
    .sort({ startDate: 1, createdAt: 1 })
    .populate('patient', 'uhid name mobile cH age gender address')
    .populate('branch', 'name')
    .populate('department', 'name')
    .populate('doctor', 'name')
    .lean();

  if (!courses.length) {
    return res.status(200).json(new ApiResponse(200, []));
  }

  const courseIds = courses.map((c) => c._id);
  const [visitAgg, payAgg] = await Promise.all([
    Visit.aggregate([
      { $match: { courseId: { $in: courseIds } } },
      {
        $group: {
          _id: '$courseId',
          completedDays: { $sum: 1 },
          lastVisitDate: { $max: '$visitDate' },
        },
      },
    ]),
    PaymentTransaction.aggregate([
      { $match: { courseId: { $in: courseIds } } },
      { $group: { _id: '$courseId', paid: { $sum: '$amount' } } },
    ]),
  ]);
  const visitMap = {};
  visitAgg.forEach((r) => (visitMap[r._id.toString()] = r));
  const payMap = {};
  payAgg.forEach((r) => (payMap[r._id.toString()] = r));

  const rows = courses.map((c) => {
    const id = c._id.toString();
    const completedDays = visitMap[id]?.completedDays || 0;
    const paid = round2((payMap[id]?.paid || 0) + (c.initialAdvance || 0));
    const billed = courseBilled(c);
    const due = Math.max(0, round2(billed - paid));
    const balance = Math.max(0, round2(paid - billed));
    const totalDays = Math.max(1, c.totalDays || 1);
    const nextDay = Math.min(completedDays + 1, totalDays);
    const scheduled = new Date(c.startDate);
    scheduled.setDate(scheduled.getDate() + completedDays);
    return {
      course: {
        _id: c._id,
        courseNo: c.courseNo,
        treatment: c.treatment,
        status: c.status,
        totalDays,
        dayNumber: c.dayNumber || nextDay,
        startDate: c.startDate,
        endDate: c.endDate,
        courseAmount: c.courseAmount,
        additionalCharges: c.additionalCharges || 0,
        initialAdvance: round2(c.initialAdvance || 0),
      },
      patient: c.patient
        ? {
            _id: c.patient._id,
            uhid: c.patient.uhid,
            name: c.patient.name,
            mobile: c.patient.mobile,
            cH: c.patient.cH,
          }
        : null,
      branch: c.branch?.name || null,
      department: c.department?.name || null,
      doctor: c.doctor?.name || null,
      billed,
      paid,
      due,
      balance,
      completedDays,
      nextDay,
      nextDayDate: scheduled,
      lastVisitDate: visitMap[id]?.lastVisitDate || null,
      progress: `${completedDays}/${totalDays}`,
    };
  });

  rows.sort((a, b) => {
    const pa = a.completedDays / a.course.totalDays;
    const pb = b.completedDays / b.course.totalDays;
    if (pa !== pb) return pa - pb;
    return new Date(a.course.startDate) - new Date(b.course.startDate);
  });

  res.status(200).json(new ApiResponse(200, rows));
});

module.exports = {
  createCourse,
  getActiveCourse,
  getCourse,
  listCourseVisits,
  addFollowUp,
  recordPayment,
  getCourseBalance,
  listPatientCourses,
  listActiveCourses,
};