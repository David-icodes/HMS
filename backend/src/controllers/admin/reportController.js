const mongoose = require('mongoose');
const Visit = require('../../models/Visit');
const HomeVisit = require('../../models/HomeVisit');
const Patient = require('../../models/Patient');
const Course = require('../../models/Course');
const PaymentTransaction = require('../../models/PaymentTransaction');
const User = require('../../models/User');
const Branch = require('../../models/Branch');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

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

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

// Patients whose C/H is Home (free-text, case/space tolerant). Everyone else (including
// legacy patients with no cH) counts as Clinic.
const HOME_CH_RE = /^\s*home\s*$/i;

const homePatientIds = async () => {
  const ids = await Patient.distinct('_id', { cH: HOME_CH_RE });
  return ids;
};

// ---------- Daily register detail (one row per patient entry) ----------
// Detailed daily register with financials and the branch resolved to its name in
// EVERY row, so both the on-screen table and the Excel export carry the branch.
// C/H split is patient-based: visits whose patient is marked Home count as Home,
// legacy HomeVisit documents always count as Home, everything else is Clinic.
// Columns: Date, Branch, C/H, Patient Name, UHID, OP Number / Home S.No,
// Department, Doctor, Visit Type, Course Day, Course Progress, Total Billing,
// Paid, Due, Payment Method, Created By.
const dailyRegisterDetail = asyncHandler(async (req, res) => {
  const { from, to, branch, ch } = req.query;
  const range = parseRange(from, to);
  const homeIds = await homePatientIds();

  const clinicMatch = {};
  if (range.$gte || range.$lte) clinicMatch.visitDate = range;
  if (branch && mongoose.isValidObjectId(branch)) clinicMatch.branch = new mongoose.Types.ObjectId(branch);

  const homeMatch = {};
  if (range.$gte || range.$lte) homeMatch.createdAt = range;
  if (branch && mongoose.isValidObjectId(branch)) homeMatch.branch = new mongoose.Types.ObjectId(branch);

  const chKey = String(ch || '').toLowerCase();
  const chHome = chKey === 'home';
  const chClinic = chKey === 'clinic';

  const clinicVisitMatch = { ...clinicMatch, patient: { $nin: homeIds } };
  const homeVisitMatch = { ...clinicMatch, patient: { $in: homeIds } };

  const [clinicRows, homePatientVisitRows, legacyHomeRows] = await Promise.all([
    chHome
      ? []
      : Visit.find(clinicVisitMatch)
          .sort({ visitDate: 1, createdAt: 1 })
          .populate('branch', 'name')
          .populate('department', 'name')
          .populate('doctor', 'name')
          .populate('patient', 'name mobile uhid cH')
          .populate('createdBy', 'name'),
    chClinic
      ? []
      : Visit.find(homeVisitMatch)
          .sort({ visitDate: 1, createdAt: 1 })
          .populate('branch', 'name')
          .populate('department', 'name')
          .populate('doctor', 'name')
          .populate('patient', 'name mobile uhid cH')
          .populate('createdBy', 'name'),
    chClinic
      ? []
      : HomeVisit.find(homeMatch)
          .sort({ createdAt: 1 })
          .populate('branch', 'name')
          .populate('createdBy', 'name'),
  ]);

  const mapVisit = (v, cH) => {
    const billed = round2(v.charges?.total);
    const paid = round2(v.payment?.advanced);
    const due = v.payment && v.payment.due !== undefined ? round2(v.payment.due) : round2(Math.max(0, billed - paid));
    const courseDay = v.dayNumber || '';
    const courseProgress = v.totalDays ? (v.dayNumber ? `${v.dayNumber}/${v.totalDays}` : '') : '';
    return {
      date: v.visitDate ? new Date(v.visitDate).toISOString().slice(0, 10) : '',
      branch: v.branch && v.branch.name ? v.branch.name : 'Unassigned',
      cH,
      patientName: v.patient && v.patient.name ? v.patient.name : '',
      uhid: v.patient && v.patient.uhid ? v.patient.uhid : '',
      opNo: v.opNumber || '',
      serialNo: '',
      department: v.department && v.department.name ? v.department.name : '',
      doctor: v.doctor && v.doctor.name ? v.doctor.name : '',
      visitType: v.visitType || 'New OP',
      courseDay,
      courseProgress,
      billed,
      paid,
      due,
      paymentMethod: v.payment && v.payment.methodName ? v.payment.methodName : '',
      createdBy: v.createdBy && v.createdBy.name ? v.createdBy.name : '',
    };
  };

  const mapHome = (h) => {
    const billed = round2(h.total ?? (h.perSession || 0) * (h.sessions || 1));
    const paid = round2(h.advance);
    const due = round2(h.due ?? Math.max(0, billed - paid));
    return {
      date: h.createdAt ? new Date(h.createdAt).toISOString().slice(0, 10) : '',
      branch: h.branch && h.branch.name ? h.branch.name : 'Unassigned',
      cH: 'Home',
      patientName: h.patientName || '',
      uhid: '',
      opNo: '',
      serialNo: h.serialNo || '',
      department: '',
      doctor: h.referralDoctor || '',
      visitType: 'Home Visit',
      courseDay: '',
      courseProgress: '',
      billed,
      paid,
      due,
      paymentMethod: h.paymentMethod || '',
      createdBy: h.createdBy && h.createdBy.name ? h.createdBy.name : '',
    };
  };

  const out = [
    ...clinicRows.map((v) => mapVisit(v, 'Clinic')),
    ...homePatientVisitRows.map((v) => mapVisit(v, 'Home')),
    ...legacyHomeRows.map(mapHome),
  ];
  out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.patientName.localeCompare(b.patientName)));

  const totals = out.reduce(
    (acc, r) => ({ billed: acc.billed + r.billed, paid: acc.paid + r.paid, due: acc.due + r.due }),
    { billed: 0, paid: 0, due: 0 }
  );

  res.status(200).json(new ApiResponse(200, { data: out, totals, count: out.length }));
});

// ---------- Daily register: Clinic + Home Visits = Total (per date, per branch) ----------
// Clinic/OP count comes from visits by patients whose C/H is not Home; Home count =
// visits by Home patients + legacy HomeVisit documents. Purely operational counts, not
// revenue.
const dailyRegister = asyncHandler(async (req, res) => {
  const { from, to, branch, ch } = req.query;
  const range = parseRange(from, to);
  const homeIds = await homePatientIds();

  const clinicVisitMatch = {};
  if (range.$gte || range.$lte) clinicVisitMatch.visitDate = range;
  if (branch && mongoose.isValidObjectId(branch)) clinicVisitMatch.branch = new mongoose.Types.ObjectId(branch);

  const homeVisitMatch = {};
  if (range.$gte || range.$lte) homeVisitMatch.visitDate = range;
  if (branch && mongoose.isValidObjectId(branch)) homeVisitMatch.branch = new mongoose.Types.ObjectId(branch);

  const homeDocMatch = {};
  if (range.$gte || range.$lte) homeDocMatch.createdAt = range;
  if (branch && mongoose.isValidObjectId(branch)) homeDocMatch.branch = new mongoose.Types.ObjectId(branch);

  const chKey = String(ch || '').toLowerCase();
  const chHome = chKey === 'home';
  const chClinic = chKey === 'clinic';

  const [clinicAgg, homePatientAgg, homeAgg] = await Promise.all([
    chHome
      ? Promise.resolve([])
      : Visit.aggregate([
          { $match: { ...clinicVisitMatch, patient: { $nin: homeIds } } },
          {
            $group: {
              _id: {
                date: { $dateToString: { format: '%Y-%m-%d', date: '$visitDate' } },
                branch: '$branch',
              },
              clinic: { $sum: 1 },
            },
          },
        ]),
    chClinic
      ? Promise.resolve([])
      : Visit.aggregate([
          { $match: { ...homeVisitMatch, patient: { $in: homeIds } } },
          {
            $group: {
              _id: {
                date: { $dateToString: { format: '%Y-%m-%d', date: '$visitDate' } },
                branch: '$branch',
              },
              home: { $sum: 1 },
            },
          },
        ]),
    chClinic
      ? Promise.resolve([])
      : HomeVisit.aggregate([
          { $match: homeDocMatch },
          {
            $group: {
              _id: {
                date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                branch: '$branch',
              },
              home: { $sum: 1 },
            },
          },
        ]),
  ]);

  const branchIds = new Set();
  clinicAgg.forEach((r) => { if (r._id.branch) branchIds.add(r._id.branch.toString()); });
  homePatientAgg.forEach((r) => { if (r._id.branch) branchIds.add(r._id.branch.toString()); });
  homeAgg.forEach((r) => { if (r._id.branch) branchIds.add(r._id.branch.toString()); });

  const branchNames = {};
  if (branchIds.size) {
    (await Branch.find({ _id: { $in: [...branchIds] } }).select('name')).forEach(
      (b) => (branchNames[b._id.toString()] = b.name)
    );
  }

  const map = {};
  const add = (ag, field) => {
    ag.forEach((r) => {
      const key = `${r._id.date}|${r._id.branch ? r._id.branch.toString() : 'none'}`;
      if (!map[key]) map[key] = { date: r._id.date, branchId: r._id.branch || null, clinic: 0, home: 0 };
      map[key][field] += r[field];
    });
  };
  add(clinicAgg, 'clinic');
  add(homePatientAgg, 'home');
  add(homeAgg, 'home');

  const rows = Object.values(map).map((r) => ({
    date: r.date,
    branchId: r.branchId,
    branchName: (r.branchId && branchNames[r.branchId.toString()]) || 'Unassigned',
    clinic: r.clinic,
    home: r.home,
    total: r.clinic + r.home,
  }));
  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.branchName || '').localeCompare(b.branchName || '')));

  const totals = rows.reduce(
    (acc, r) => ({ clinic: acc.clinic + r.clinic, home: acc.home + r.home, total: acc.total + r.total }),
    { clinic: 0, home: 0, total: 0 }
  );

  res.status(200).json(new ApiResponse(200, { data: rows, totals }));
});

// ---------- Staff activity report ----------
// Per-staff daily entry counts (Clinic visits + Home Visits) with optional filters:
// staff, from, to, branch, visitType (All | Clinic | Home Visit).
const staffActivity = asyncHandler(async (req, res) => {
  const { staff, from, to, branch, visitType } = req.query;
  const range = parseRange(from, to);

  const clinicMatch = {};
  if (range.$gte || range.$lte) clinicMatch.visitDate = range;
  if (branch && mongoose.isValidObjectId(branch)) clinicMatch.branch = new mongoose.Types.ObjectId(branch);
  if (staff && mongoose.isValidObjectId(staff)) clinicMatch.createdBy = new mongoose.Types.ObjectId(staff);

  const homeMatch = {};
  if (range.$gte || range.$lte) homeMatch.createdAt = range;
  if (branch && mongoose.isValidObjectId(branch)) homeMatch.branch = new mongoose.Types.ObjectId(branch);
  if (staff && mongoose.isValidObjectId(staff)) homeMatch.createdBy = new mongoose.Types.ObjectId(staff);

  const type = (visitType || '').toLowerCase();

  const [clinicAgg, homeAgg] = await Promise.all([
    type === 'home' ? Promise.resolve([]) : Visit.aggregate([
      { $match: clinicMatch },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$visitDate' } },
            staff: '$createdBy',
            branch: '$branch',
          },
          clinic: { $sum: 1 },
        },
      },
    ]),
    type === 'clinic' ? Promise.resolve([]) : HomeVisit.aggregate([
      { $match: homeMatch },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            staff: '$createdBy',
            branch: '$branch',
          },
          home: { $sum: 1 },
        },
      },
    ]),
  ]);

  const collect = (ag, field) => {
    const out = {};
    for (const r of ag) {
      const staffId = r._id.staff ? r._id.staff.toString() : '';
      const branchId = r._id.branch ? r._id.branch.toString() : '';
      const key = `${r._id.date}|${staffId}|${branchId}`;
      if (!out[key]) out[key] = { date: r._id.date, staffId, branchId, clinic: 0, home: 0 };
      out[key][field] += r[field];
    }
    return out;
  };

  const clinicMap = collect(clinicAgg, 'clinic');
  const homeMap = collect(homeAgg, 'home');

  const combinedMap = { ...homeMap };
  for (const key of Object.keys(clinicMap)) {
    if (combinedMap[key]) combinedMap[key].clinic += clinicMap[key].clinic;
    else combinedMap[key] = clinicMap[key];
  }

  const staffIds = new Set(Object.values(combinedMap).map((r) => r.staffId).filter(Boolean));
  const branchIds = new Set(Object.values(combinedMap).map((r) => r.branchId).filter(Boolean));

  const staffNames = {};
  if (staffIds.size) {
    (await User.find({ _id: { $in: [...staffIds] } }).select('name role')).forEach(
      (u) => (staffNames[u._id.toString()] = `${u.name}${u.role ? ` (${u.role})` : ''}`)
    );
  }
  const branchNames = {};
  if (branchIds.size) {
    (await Branch.find({ _id: { $in: [...branchIds] } }).select('name')).forEach(
      (b) => (branchNames[b._id.toString()] = b.name)
    );
  }

  const rows = Object.values(combinedMap).map((r) => ({
    date: r.date,
    staffId: r.staffId,
    staffName: staffNames[r.staffId] || 'Unassigned',
    branchId: r.branchId,
    branchName: (r.branchId && branchNames[r.branchId]) || 'Unassigned',
    clinic: r.clinic,
    home: r.home,
    total: r.clinic + r.home,
  }));
  rows.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : (a.staffName || '').localeCompare(b.staffName || '')));

  const totals = rows.reduce(
    (acc, r) => ({ clinic: acc.clinic + r.clinic, home: acc.home + r.home, total: acc.total + r.total }),
    { clinic: 0, home: 0, total: 0 }
  );

  res.status(200).json(new ApiResponse(200, { data: rows, totals }));
});

// ---------- Detailed staff activity (for detail/export) ----------
// Lists individual entries with patient name, visit type, OP/Home S.No, created time.
const staffActivityDetail = asyncHandler(async (req, res) => {
  const { staff, from, to, branch, visitType } = req.query;
  const range = parseRange(from, to);
  const type = (visitType || '').toLowerCase();

  const clinicMatch = {};
  if (range.$gte || range.$lte) clinicMatch.visitDate = range;
  if (branch && mongoose.isValidObjectId(branch)) clinicMatch.branch = new mongoose.Types.ObjectId(branch);
  if (staff && mongoose.isValidObjectId(staff)) clinicMatch.createdBy = new mongoose.Types.ObjectId(staff);

  const homeMatch = {};
  if (range.$gte || range.$lte) homeMatch.createdAt = range;
  if (branch && mongoose.isValidObjectId(branch)) homeMatch.branch = new mongoose.Types.ObjectId(branch);
  if (staff && mongoose.isValidObjectId(staff)) homeMatch.createdBy = new mongoose.Types.ObjectId(staff);

  const [clinicRows, homeRows] = await Promise.all([
    type === 'home'
      ? []
      : Visit.find(clinicMatch)
          .sort({ visitDate: -1, createdAt: -1 })
          .select('patient visitDate opNumber createdBy branch')
          .populate('patient', 'name mobile')
          .populate('createdBy', 'name')
          .populate('branch', 'name'),
    type === 'clinic'
      ? []
      : HomeVisit.find(homeMatch)
          .sort({ createdAt: -1 })
          .select('patientName serialNo createdAt createdBy branch')
          .populate('createdBy', 'name')
          .populate('branch', 'name'),
  ]);

  const out = [
    ...clinicRows.map((v) => ({
      date: (v.visitDate || v.createdAt) ? new Date(v.visitDate || v.createdAt).toISOString().slice(0, 10) : '',
      createdTime: v.createdAt ? new Date(v.createdAt).toISOString().slice(11, 19) : '',
      staff: v.createdBy && v.createdBy.name ? v.createdBy.name : 'Unassigned',
      branch: v.branch && v.branch.name ? v.branch.name : 'Unassigned',
      patientName: v.patient && v.patient.name ? v.patient.name : '',
      visitType: 'Clinic',
      opNo: v.opNumber || '',
      serialNo: '',
    })),
    ...homeRows.map((h) => ({
      date: h.createdAt ? new Date(h.createdAt).toISOString().slice(0, 10) : '',
      createdTime: h.createdAt ? new Date(h.createdAt).toISOString().slice(11, 19) : '',
      staff: h.createdBy && h.createdBy.name ? h.createdBy.name : 'Unassigned',
      branch: h.branch && h.branch.name ? h.branch.name : 'Unassigned',
      patientName: h.patientName || '',
      visitType: 'Home Visit',
      opNo: '',
      serialNo: h.serialNo || '',
    })),
  ];
  out.sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    return d !== 0 ? d : (a.createdTime || '').localeCompare(b.createdTime || '');
  });
  res.status(200).json(new ApiResponse(200, { data: out }));
});

// ---------- Staff analytics (per staff, with financials) ----------
// One row per staff member over the filtered range. Filters: staff, from, to, branch,
// ch (All | Clinic | Home). Money uses the PaymentTransaction ledger first, then the
// legacy OP advanced fallback (visits not covered by any transaction); Home Visit money
// is counted from the HomeVisit advance. C/H is patient-based.
const staffAnalytics = asyncHandler(async (req, res) => {
  const { staff, from, to, branch, ch } = req.query;
  const range = parseRange(from, to);
  const homeIds = await homePatientIds();
  const chKey = String(ch || '').toLowerCase();
  const chHome = chKey === 'home';
  const chClinic = chKey === 'clinic';

  const branchId = branch && mongoose.isValidObjectId(branch) ? new mongoose.Types.ObjectId(branch) : null;
  const staffId = staff && mongoose.isValidObjectId(staff) ? new mongoose.Types.ObjectId(staff) : null;

  const visitMatch = {
    ...(range.$gte || range.$lte ? { visitDate: range } : {}),
    ...(branchId ? { branch: branchId } : {}),
    ...(staffId ? { createdBy: staffId } : {}),
    ...(chHome ? { patient: { $in: homeIds } } : chClinic ? { patient: { $nin: homeIds } } : {}),
  };
  const hvMatch = {
    ...(range.$gte || range.$lte ? { createdAt: range } : {}),
    ...(branchId ? { branch: branchId } : {}),
    ...(staffId ? { createdBy: staffId } : {}),
    ...(chClinic ? { _id: { $in: [] } } : {}),
  };
  const txMatch = {
    ...(range.$gte || range.$lte ? { paymentDate: range } : {}),
    ...(branchId ? { branchId } : {}),
    ...(staffId ? { createdBy: staffId } : {}),
    ...(chHome ? { patientId: { $in: homeIds } } : chClinic ? { patientId: { $nin: homeIds } } : {}),
  };
  const patientMatch = {
    ...(range.$gte || range.$lte ? { createdAt: range } : {}),
    ...(staffId ? { createdBy: staffId } : {}),
    ...(chHome ? { cH: HOME_CH_RE } : chClinic ? { cH: { $not: HOME_CH_RE } } : {}),
  };
  const courseMatch = {
    ...(range.$gte || range.$lte ? { createdAt: range } : {}),
    ...(branchId ? { branch: branchId } : {}),
    ...(staffId ? { createdBy: staffId } : {}),
    ...(chHome ? { patient: { $in: homeIds } } : chClinic ? { patient: { $nin: homeIds } } : {}),
  };

  // Legacy OP money not already captured by a PaymentTransaction.
  const coveredVisitIds = await PaymentTransaction.distinct('visitId');
  const coveredCourseIds = await PaymentTransaction.distinct('courseId');
  const legacyMatch = {
    ...visitMatch,
    'payment.advanced': { $gt: 0 },
    $or: [{ courseId: null }, { courseId: { $nin: coveredCourseIds } }],
    _id: { $nin: coveredVisitIds },
  };

  const [visitAgg, hvAgg, txAgg, legacyAgg, patientAgg, courseAgg, followUpAgg] = await Promise.all([
    Visit.aggregate([
      { $match: visitMatch },
      { $group: { _id: '$createdBy', entries: { $sum: 1 }, billed: { $sum: '$charges.total' } } },
    ]),
    HomeVisit.aggregate([
      { $match: hvMatch },
      { $group: { _id: '$createdBy', entries: { $sum: 1 }, billed: { $sum: { $ifNull: ['$total', { $multiply: [{ $ifNull: ['$perSession', 0] }, { $ifNull: ['$sessions', 1] }] }] } }, paid: { $sum: { $ifNull: ['$advance', 0] } } } },
    ]),
    PaymentTransaction.aggregate([
      { $match: txMatch },
      { $group: { _id: '$createdBy', paid: { $sum: '$amount' }, payments: { $sum: 1 } } },
    ]),
    Visit.aggregate([
      { $match: legacyMatch },
      { $group: { _id: '$createdBy', paid: { $sum: '$payment.advanced' }, payments: { $sum: 1 } } },
    ]),
    Patient.aggregate([
      { $match: patientMatch },
      { $group: { _id: '$createdBy', patients: { $sum: 1 } } },
    ]),
    Course.aggregate([
      { $match: courseMatch },
      { $group: { _id: '$createdBy', courses: { $sum: 1 } } },
    ]),
    Visit.aggregate([
      { $match: { ...visitMatch, visitType: 'Follow-up' } },
      { $group: { _id: '$createdBy', followUps: { $sum: 1 } } },
    ]),
  ]);

  const keyOf = (id) => (id ? id.toString() : 'unassigned');
  const map = {};
  const add = (id, patch) => {
    const key = keyOf(id);
    if (!map[key]) map[key] = { staffId: id || null, entries: 0, billed: 0, paid: 0, newPatients: 0, courses: 0, followUps: 0, payments: 0 };
    Object.assign(map[key], patch ?? {});
  };
  visitAgg.forEach((r) => add(r._id, { entries: r.entries, billed: r.billed || 0 }));
  hvAgg.forEach((r) => add(r._id, { entries: (map[keyOf(r._id)]?.entries || 0) + r.entries, billed: (map[keyOf(r._id)]?.billed || 0) + (r.billed || 0), paid: (map[keyOf(r._id)]?.paid || 0) + (r.paid || 0) }));
  txAgg.forEach((r) => add(r._id, { paid: (map[keyOf(r._id)]?.paid || 0) + (r.paid || 0), payments: (map[keyOf(r._id)]?.payments || 0) + r.payments }));
  legacyAgg.forEach((r) => add(r._id, { paid: (map[keyOf(r._id)]?.paid || 0) + (r.paid || 0), payments: (map[keyOf(r._id)]?.payments || 0) + r.payments }));
  patientAgg.forEach((r) => add(r._id, { newPatients: r.patients }));
  courseAgg.forEach((r) => add(r._id, { courses: r.courses }));
  followUpAgg.forEach((r) => add(r._id, { followUps: r.followUps }));

  const staffIds = [...new Set(Object.values(map).map((r) => r.staffId).filter(Boolean))];
  const nameMap = {};
  if (staffIds.length) {
    (await User.find({ _id: { $in: staffIds } }).select('name role')).forEach(
      (u) => (nameMap[u._id.toString()] = { name: u.name, role: u.role })
    );
  }

  const rows = Object.values(map).map((r) => {
    const billed = Math.max(0, Math.round((r.billed || 0) * 100) / 100);
    const paid = Math.max(0, Math.round((r.paid || 0) * 100) / 100);
    return {
      staffId: r.staffId,
      staffName: (r.staffId && nameMap[keyOf(r.staffId)]?.name) || 'Unassigned',
      role: (r.staffId && nameMap[keyOf(r.staffId)]?.role) || '',
      entries: r.entries,
      newPatients: r.newPatients || 0,
      courses: r.courses || 0,
      followUps: r.followUps || 0,
      billed,
      paid,
      due: Math.max(0, Math.round((billed - paid) * 100) / 100),
      balance: Math.max(0, Math.round((paid - billed) * 100) / 100),
      payments: r.payments || 0,
    };
  });
  rows.sort((a, b) => b.billed - a.billed || b.entries - a.entries);

  const totals = rows.reduce(
    (acc, r) => ({
      entries: acc.entries + r.entries,
      newPatients: acc.newPatients + r.newPatients,
      courses: acc.courses + r.courses,
      followUps: acc.followUps + r.followUps,
      billed: acc.billed + r.billed,
      paid: acc.paid + r.paid,
      payments: acc.payments + r.payments,
    }),
    { entries: 0, newPatients: 0, courses: 0, followUps: 0, billed: 0, paid: 0, payments: 0 }
  );
  totals.due = Math.max(0, Math.round((totals.billed - totals.paid) * 100) / 100);
  totals.balance = Math.max(0, Math.round((totals.paid - totals.billed) * 100) / 100);

  res.status(200).json(new ApiResponse(200, { data: rows, totals }));
});

// ---------- Staff analytics detail (individual entries for export) ----------
// One row per record (visit / home visit / course registration / new patient /
// payment) created by the filtered staff within the range.
const staffAnalyticsDetail = asyncHandler(async (req, res) => {
  const { staff, from, to, branch, ch } = req.query;
  const range = parseRange(from, to);
  const homeIds = await homePatientIds();
  const chKey = String(ch || '').toLowerCase();
  const chHome = chKey === 'home';
  const chClinic = chKey === 'clinic';

  const branchId = branch && mongoose.isValidObjectId(branch) ? new mongoose.Types.ObjectId(branch) : null;
  const staffId = staff && mongoose.isValidObjectId(staff) ? new mongoose.Types.ObjectId(staff) : null;

  const visitMatch = {
    ...(range.$gte || range.$lte ? { visitDate: range } : {}),
    ...(branchId ? { branch: branchId } : {}),
    ...(staffId ? { createdBy: staffId } : {}),
    ...(chHome ? { patient: { $in: homeIds } } : chClinic ? { patient: { $nin: homeIds } } : {}),
  };
  const hvMatch = {
    ...(range.$gte || range.$lte ? { createdAt: range } : {}),
    ...(branchId ? { branch: branchId } : {}),
    ...(staffId ? { createdBy: staffId } : {}),
    ...(chClinic ? { _id: { $in: [] } } : {}),
  };
  const patientMatch = {
    ...(range.$gte || range.$lte ? { createdAt: range } : {}),
    ...(staffId ? { createdBy: staffId } : {}),
    ...(chHome ? { cH: HOME_CH_RE } : chClinic ? { cH: { $not: HOME_CH_RE } } : {}),
  };
  const courseMatch = {
    ...(range.$gte || range.$lte ? { createdAt: range } : {}),
    ...(branchId ? { branch: branchId } : {}),
    ...(staffId ? { createdBy: staffId } : {}),
    ...(chHome ? { patient: { $in: homeIds } } : chClinic ? { patient: { $nin: homeIds } } : {}),
  };
  const txMatch = {
    ...(range.$gte || range.$lte ? { paymentDate: range } : {}),
    ...(branchId ? { branchId } : {}),
    ...(staffId ? { createdBy: staffId } : {}),
    ...(chHome ? { patientId: { $in: homeIds } } : chClinic ? { patientId: { $nin: homeIds } } : {}),
  };

  const [visits, homeVisits, patients, courses, payments] = await Promise.all([
    Visit.find(visitMatch)
      .sort({ visitDate: -1, createdAt: -1 })
      .populate('patient', 'name uhid cH')
      .populate('createdBy', 'name')
      .populate('branch', 'name'),
    HomeVisit.find(hvMatch)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name')
      .populate('branch', 'name'),
    Patient.find(patientMatch)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'name'),
    Course.find(courseMatch)
      .sort({ createdAt: -1 })
      .populate('patient', 'name uhid cH')
      .populate('createdBy', 'name')
      .populate('branch', 'name'),
    PaymentTransaction.find(txMatch)
      .sort({ paymentDate: -1, createdAt: -1 })
      .populate('patientId', 'name')
      .populate('createdBy', 'name'),
  ]);

  const iso = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
  const out = [
    ...visits.map((v) => ({
      date: iso(v.visitDate || v.createdAt),
      createdTime: v.createdAt ? new Date(v.createdAt).toISOString().slice(11, 19) : '',
      staff: v.createdBy?.name || 'Unassigned',
      branch: v.branch?.name || 'Unassigned',
      patientName: v.patient?.name || '',
      uhid: v.patient?.uhid || '',
      type: v.visitType || 'New OP',
      cH: HOME_CH_RE.test(v.patient?.cH || '') ? 'Home' : 'Clinic',
      recordNo: v.opNumber || '',
      billed: round2(v.charges?.total),
      paid: round2(v.payment?.advanced),
      due: v.payment && v.payment.due !== undefined ? round2(v.payment.due) : round2(Math.max(0, (v.charges?.total || 0) - (v.payment?.advanced || 0))),
    })),
    ...homeVisits.map((h) => {
      const billed = round2(h.total ?? (h.perSession || 0) * (h.sessions || 1));
      return {
        date: iso(h.createdAt),
        createdTime: h.createdAt ? new Date(h.createdAt).toISOString().slice(11, 19) : '',
        staff: h.createdBy?.name || 'Unassigned',
        branch: h.branch?.name || 'Unassigned',
        patientName: h.patientName || '',
        uhid: '',
        type: 'Home Visit',
        cH: 'Home',
        recordNo: h.serialNo || '',
        billed,
        paid: round2(h.advance),
        due: round2(h.due ?? Math.max(0, billed - (h.advance || 0))),
      };
    }),
    ...courses.map((c) => {
      const billed = round2((c.courseAmount || 0) + (c.additionalCharges || 0));
      const paid = round2(c.initialAdvance || 0);
      return {
        date: iso(c.createdAt),
        createdTime: c.createdAt ? new Date(c.createdAt).toISOString().slice(11, 19) : '',
        staff: c.createdBy?.name || 'Unassigned',
        branch: c.branch?.name || 'Unassigned',
        patientName: c.patient?.name || '',
        uhid: c.patient?.uhid || '',
        type: 'Course Registration',
        cH: HOME_CH_RE.test(c.patient?.cH || '') ? 'Home' : 'Clinic',
        recordNo: c.courseNo || '',
        billed,
        paid,
        due: Math.max(0, round2(billed - paid)),
      };
    }),
    ...patients.map((p) => ({
      date: iso(p.createdAt),
      createdTime: p.createdAt ? new Date(p.createdAt).toISOString().slice(11, 19) : '',
      staff: p.createdBy?.name || 'Unassigned',
      branch: '',
      patientName: p.name || '',
      uhid: p.uhid || '',
      type: 'New Patient',
      cH: HOME_CH_RE.test(p.cH || '') ? 'Home' : 'Clinic',
      recordNo: p.uhid || '',
      billed: 0,
      paid: 0,
      due: 0,
    })),
    ...payments.map((t) => ({
      date: iso(t.paymentDate || t.createdAt),
      createdTime: t.createdAt ? new Date(t.createdAt).toISOString().slice(11, 19) : '',
      staff: t.createdBy?.name || 'Unassigned',
      branch: '',
      patientName: t.patientId?.name || '',
      uhid: '',
      type: 'Payment',
      cH: '',
      recordNo: t.note || '',
      billed: 0,
      paid: round2(t.amount),
      due: 0,
    })),
  ];
  out.sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    return d !== 0 ? d : (a.createdTime || '').localeCompare(b.createdTime || '');
  });
  res.status(200).json(new ApiResponse(200, { data: out }));
});

module.exports = { dailyRegister, dailyRegisterDetail, staffActivity, staffActivityDetail, staffAnalytics, staffAnalyticsDetail };
