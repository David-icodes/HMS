const mongoose = require('mongoose');
const Patient = require('../../models/Patient');
const Visit = require('../../models/Visit');
const HomeVisit = require('../../models/HomeVisit');
const PaymentTransaction = require('../../models/PaymentTransaction');
const Course = require('../../models/Course');
const Branch = require('../../models/Branch');
const { registrationCountsByBranch, registrationDataByBranch, patientIdsByRegistrationBranch } = require('../../utils/registrationBranch');
const ApiResponse = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

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

// Build a Mongo filter from common query params (date / dateRange / branch / method)
// applied against the Visit collection. Revenue & different patient figures come from
// actual Visit charges/payment records (never from patient counts).
const buildVisitFilter = (q) => {
  const filter = {};
  const range = parseRange(q.date || q.from, q.date || q.to);
  if (range.$gte || range.$lte) filter.visitDate = range;
  if (q.branch && mongoose.isValidObjectId(q.branch)) filter.branch = new mongoose.Types.ObjectId(q.branch);
  if (q.method) {
    if (mongoose.isValidObjectId(q.method)) filter['payment.method'] = new mongoose.Types.ObjectId(q.method);
    else filter['payment.methodName'] = new RegExp(String(q.method), 'i');
  }
  return filter;
};

// C/H split is patient-based: patients whose C/H is Home (free-text, case/space
// tolerant) own Home revenue; everything else is Clinic. Legacy HomeVisit documents
// (standalone records) always count as Home.
const HOME_CH_RE = /^\s*home\s*$/i;

const homePatientIds = async () => {
  const ids = await Patient.distinct('_id', { cH: HOME_CH_RE });
  return ids;
};

// A revenue view's PATIENT figure = the number of VALID (non-archived) Patient
// REGISTRATION records in scope, using the exact same ledger and branch
// attribution as the Admin Patients list and the Branch Reports cards:
//   date   = patient.createdAt (the registration date), never visit/payment dates;
//   branch = the registration branch attribution (a follow-up/course-day never
//            moves a patient to another branch);
//   ch     = the patient's own Clinic/Home classification.
// Follow-up visits, course days, payments and transactions NEVER add patients.
const registrationMatch = async (range, branch, ch) => {
  const match = { isArchived: { $ne: true } };
  if (range.$gte || range.$lte) match.createdAt = range;
  if (ch === 'home') match.cH = HOME_CH_RE;
  else if (ch === 'clinic') match.cH = { $not: HOME_CH_RE };
  if (branch && mongoose.isValidObjectId(branch)) {
    match._id = { $in: await patientIdsByRegistrationBranch(branch) };
  }
  return match;
};

const isHomePatientAgg = { $in: [{ $toLower: { $trim: { input: { $ifNull: ['$cH', ''] } } } }, ['home']] };

// Per-day patient-registration counts for a revenue date scope (same semantics
// as registrationMatch, grouped by the registration's local day).
const registrationByDay = async (range, branch, ch) => {
  const match = { isArchived: { $ne: true } };
  if (range.$gte || range.$lte) match.createdAt = range;
  if (ch === 'home') match.cH = HOME_CH_RE;
  else if (ch === 'clinic') match.cH = { $not: HOME_CH_RE };
  if (branch && mongoose.isValidObjectId(branch)) {
    match._id = { $in: await patientIdsByRegistrationBranch(branch) };
  }
  return Patient.aggregate([
    { $match: match },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } },
        patients: { $sum: 1 },
        clinic: { $sum: { $cond: [isHomePatientAgg, 0, 1] } },
        home: { $sum: { $cond: [isHomePatientAgg, 1, 0] } },
      },
    },
  ]);
};

// ---------- Branch list: patients + finances per branch ----------
// Branch patient counts come from the canonical Patient registration ledger
// attributed to the branch of each registration (first New OP visit). Visit,
// follow-up, course-day and payment records never multiply these counts, and an
// archived (deleted) registration drops out immediately. Financial figures come
// from the shared branchFinancialMap (billed once per course, paid = actual valid
// payments), so a card always reflects the current database state after refetch.
const branchList = asyncHandler(async (req, res) => {
  const q = req.query;
  const range = parseRange(q.date || q.from, q.date || q.to);
  const reg = await registrationDataByBranch(range);
  const counts = reg.counts;
  const finances = await branchFinancialMap({
    visitFilter: buildVisitFilter(q),
    visitScope: {},
    txFilter: buildTxFilter(q),
    homeFilter: buildHomeVisitFilter(q),
    chHome: false,
    attribution: reg.attribution,
  });
  const branches = await Branch.find({ isActive: true }).sort({ order: 1, name: 1 });
  const rows = branches.map((b) => {
    const c = counts.get(b._id.toString()) || { patients: 0, clinic: 0, home: 0 };
    const f = finances[b._id.toString()] || { totalBilled: 0, totalPaid: 0, totalDue: 0, totalBalance: 0 };
    return {
      _id: b._id,
      name: b.name,
      area: b.area,
      patients: c.patients,
      clinicPatients: c.clinic,
      homePatients: c.home,
      billed: f.totalBilled,
      paid: f.totalPaid,
      due: f.totalDue,
      balance: f.totalBalance,
    };
  });

  res.status(200).json(new ApiResponse(200, rows));
});

// ---------- Single branch: registration-based stats + registration list ----------
const branchDetail = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid branch id');
  const branch = await Branch.findById(req.params.id);
  if (!branch) throw new ApiError(404, 'Branch not found');

  const q = req.query;
  const range = parseRange(q.date || q.from, q.date || q.to);
  const counts = await registrationCountsByBranch(range);
  const c = counts.get(req.params.id) || { patients: 0, clinic: 0, home: 0 };

  const ids = await patientIdsByRegistrationBranch(req.params.id);
  const query = {
    isArchived: { $ne: true },
    _id: { $in: ids },
    ...(range.$gte || range.$lte ? { createdAt: range } : {}),
  };
  const page = Math.max(1, Math.floor(Number(q.page) || 1));
  const limit = Math.min(500, Math.max(1, Math.floor(Number(q.limit) || 100)));
  const [total, registrations] = await Promise.all([
    Patient.countDocuments(query),
    Patient.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('uhid name mobile age gender cH fN address createdAt')
      .lean(),
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      branch: { _id: branch._id, name: branch.name, area: branch.area, phone: branch.phone },
      stats: { patients: c.patients, clinicPatients: c.clinic, homePatients: c.home },
      registrations,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    })
  );
});

// ---------- Revenue: summary + branch table + payment-method table ----------
// Authoritative financial source = PaymentTransaction (each payment counted ONCE).
// Legacy fallback: OP visits not touched by any transaction (created before the course/
// payment feature) contribute their payment.advanced + charges.total, and Home Visits
// contribute their total/advance (actual money received). Follow-up visits have ₹0
// charges so a 10-day ₹10,000 course never inflates billing to ₹100,000.
const buildHomeVisitFilter = (q) => {
  const filter = {};
  const range = parseRange(q.date || q.from, q.date || q.to);
  if (range.$gte || range.$lte) filter.createdAt = range;
  if (q.branch && mongoose.isValidObjectId(q.branch)) filter.branch = new mongoose.Types.ObjectId(q.branch);
  if (q.method) filter.paymentMethod = new RegExp(String(q.method), 'i');
  return filter;
};

const buildTxFilter = (q) => {
  const filter = {};
  const range = parseRange(q.date || q.from, q.date || q.to);
  if (range.$gte || range.$lte) filter.paymentDate = range;
  if (q.branch && mongoose.isValidObjectId(q.branch)) filter.branchId = new mongoose.Types.ObjectId(q.branch);
  if (q.method) {
    if (mongoose.isValidObjectId(q.method)) filter.$or = [{ paymentMethodId: new mongoose.Types.ObjectId(q.method) }, { paymentMethod: new RegExp(String(q.method), 'i') }];
    else filter.paymentMethod = new RegExp(String(q.method), 'i');
  }
  return filter;
};

// ---------- Branch-level financial aggregation ----------
// The SINGLE canonical calculation for both the Revenue page branch table and the
// Branch Reports cards. Every number below is derived from the same records the
// rest of finance uses — never from patient/visit/course-day counts:
//   billed = actual Visit/HomeVisit charges (a course is billed ONCE, on its day-1
//            visit; follow-up days are ₹0), optionally within the visit date scope;
//   paid   = ACTUAL money received: valid PaymentTransactions (+ legacy OP advances
//            not covered by any transaction + Home Visit advances), paymentDate scope;
//   due    = MAX(billed − paid, 0)  and  balance = MAX(paid − billed, 0), per branch.
const coveredByTransactions = async (txFilter) => {
  const [courses, visits] = await Promise.all([
    PaymentTransaction.distinct('courseId', { ...txFilter, courseId: { $ne: null } }),
    PaymentTransaction.distinct('visitId', { ...txFilter, visitId: { $ne: null } }),
  ]);
  return { courses, visits };
};

const branchFinancialMap = async ({ visitFilter, visitScope, txFilter, homeFilter, chHome, coveredSets, attribution }) => {
  // When `attribution` (Map<patientId, branchId>) is given — from the SAME
  // registration ledgers used for the branch patient counts — every OP money
  // source is restricted to those live registrations and attributed to the
  // patient's REGISTRATION branch. One scope for Patients, Revenue, Paid, Due:
  // an archived (deleted) registration drops out of all of them together, and
  // a payment can never land on a different branch than its patient's.
  const hasAttr = !!attribution && attribution.size > 0;
  const patientIdsArr = hasAttr ? [...attribution.keys()].map((x) => new mongoose.Types.ObjectId(x)) : [];

  const covered = coveredSets || (await coveredByTransactions(hasAttr ? { ...txFilter, patientId: { $in: patientIdsArr } } : txFilter));

  const scopedPatient = (existing) => {
    if (!hasAttr) return existing;
    if (existing) return { $and: [existing, { $in: patientIdsArr }] };
    return { $in: patientIdsArr };
  };

  const visitMatch = { ...visitFilter, ...(hasAttr || visitScope.patient ? { patient: scopedPatient(visitScope.patient) } : {}) };

  const legacyMatch = {
    ...visitFilter,
    'payment.advanced': { $gt: 0 },
    $or: [{ courseId: null }, { courseId: { $nin: covered.courses } }],
    _id: { $nin: covered.visits },
    ...(hasAttr || visitScope.patient ? { patient: scopedPatient(visitScope.patient) } : {}),
  };

  const txMatch = hasAttr ? { ...txFilter, patientId: { $in: patientIdsArr } } : txFilter;

  const branchNames = {};
  (await Branch.find({ isActive: true }).select('name')).forEach((b) => (branchNames[b._id.toString()] = b.name));

  const branchById = {};
  const putBranch = (id, patch) => {
    const key = id ? id.toString() : 'none';
    if (!branchById[key]) {
      branchById[key] = {
        branchId: id,
        branchName: (id && branchNames[id.toString()]) || 'Unassigned',
        totalBilled: 0,
        totalPaid: 0,
        totalDue: 0,
        transactions: 0,
        clinicPatients: 0,
        homeVisits: 0,
        totalPatients: 0,
      };
    }
    Object.assign(branchById[key], patch);
  };

  const [visitBranchBilled, legacyBranchAgg, txBranchAgg, homeBranchAgg] = await Promise.all([
    Visit.aggregate([
      { $match: visitMatch },
      {
        $group: hasAttr
          ? { _id: '$patient', billed: { $sum: '$charges.total' } }
          : { _id: '$branch', billed: { $sum: '$charges.total' }, patients: { $addToSet: '$patient' } },
      },
    ]),
    Visit.aggregate([
      { $match: legacyMatch },
      {
        $group: hasAttr
          ? { _id: '$patient', totalPaid: { $sum: '$payment.advanced' }, transactions: { $sum: 1 } }
          : { _id: '$branch', totalPaid: { $sum: '$payment.advanced' }, transactions: { $sum: 1 } },
      },
    ]),
    PaymentTransaction.aggregate([
      { $match: txMatch },
      {
        $group: hasAttr
          ? { _id: '$patientId', revenue: { $sum: '$amount' }, transactions: { $sum: 1 } }
          : { _id: '$branchId', revenue: { $sum: '$amount' }, transactions: { $sum: 1 } },
      },
    ]),
    HomeVisit.aggregate([
      { $match: homeFilter },
      {
        $group: {
          _id: '$branch',
          totalBilled: { $sum: { $ifNull: ['$total', { $multiply: [{ $ifNull: ['$perSession', 0] }, { $ifNull: ['$sessions', 1] }] }] } },
          totalPaid: { $sum: { $ifNull: ['$advance', 0] } },
          transactions: { $sum: 1 },
        },
      },
    ]),
  ]);

  if (hasAttr) {
    // Attribute every OP rupee to the patient's registration branch, keeping
    // the exact same patient set that produced the branch patient counts.
    const billedByBranch = new Map();
    const paidByBranch = new Map();
    const transByBranch = new Map();
    const patSetByBranch = new Map();
    const add = (map, key, n) => map.set(key, (map.get(key) || 0) + n);

    visitBranchBilled.forEach((r) => {
      const br = r._id && attribution.get(r._id.toString());
      if (!br) return;
      add(billedByBranch, br, r.billed || 0);
      if (!patSetByBranch.has(br)) patSetByBranch.set(br, new Set());
      patSetByBranch.get(br).add(r._id.toString());
    });
    legacyBranchAgg.forEach((r) => {
      const br = r._id && attribution.get(r._id.toString());
      if (!br) return;
      add(paidByBranch, br, r.totalPaid || 0);
      add(transByBranch, br, r.transactions || 0);
    });
    txBranchAgg.forEach((r) => {
      const br = r._id && attribution.get(r._id.toString());
      if (!br) return;
      add(paidByBranch, br, r.revenue || 0);
      add(transByBranch, br, r.transactions || 0);
    });

    new Set([...billedByBranch.keys(), ...paidByBranch.keys()]).forEach((br) => {
      putBranch(br, {
        totalBilled: Math.round((billedByBranch.get(br) || 0) * 100) / 100,
        totalPaid: Math.round((paidByBranch.get(br) || 0) * 100) / 100,
        transactions: transByBranch.get(br) || 0,
        clinicPatients: patSetByBranch.get(br)?.size || 0,
        totalPatients: patSetByBranch.get(br)?.size || 0,
      });
    });

    // Standalone Home Visit documents carry no patient reference (linked by
    // name), so they stay branch/date-scoped as-is.
    homeBranchAgg.forEach((r) => {
      const key = r._id ? r._id.toString() : 'none';
      putBranch(r._id, {
        totalBilled: (branchById[key]?.totalBilled || 0) + Math.round(r.totalBilled * 100) / 100,
        totalPaid: (branchById[key]?.totalPaid || 0) + Math.round(r.totalPaid * 100) / 100,
        transactions: (branchById[key]?.transactions || 0) + r.transactions,
        homeVisits: (branchById[key]?.homeVisits || 0) + r.transactions,
      });
    });
  } else {
    visitBranchBilled.forEach((r) => {
      putBranch(r._id, { totalBilled: Math.round(r.billed * 100) / 100, clinicPatients: r.patients.length, totalPatients: r.patients.length });
    });
    legacyBranchAgg.forEach((r) => {
      const key = r._id ? r._id.toString() : 'none';
      putBranch(r._id, { totalPaid: (branchById[key]?.totalPaid || 0) + Math.round(r.totalPaid * 100) / 100, transactions: (branchById[key]?.transactions || 0) + r.transactions });
    });
    txBranchAgg.forEach((r) => {
      const key = r._id ? r._id.toString() : 'none';
      putBranch(r._id, { totalPaid: (branchById[key]?.totalPaid || 0) + Math.round(r.revenue * 100) / 100, transactions: (branchById[key]?.transactions || 0) + r.transactions });
    });
    homeBranchAgg.forEach((r) => {
      const key = r._id ? r._id.toString() : 'none';
      putBranch(r._id, {
        totalBilled: (branchById[key]?.totalBilled || 0) + Math.round(r.totalBilled * 100) / 100,
        totalPaid: (branchById[key]?.totalPaid || 0) + Math.round(r.totalPaid * 100) / 100,
        transactions: (branchById[key]?.transactions || 0) + r.transactions,
        homeVisits: (branchById[key]?.homeVisits || 0) + r.transactions,
      });
      if (chHome) {
        branchById[key].clinicPatients = 0;
        branchById[key].totalPatients = r.transactions;
      }
    });
  }

  Object.values(branchById).forEach((b) => {
    b.totalDue = Math.max(0, Math.round((b.totalBilled - b.totalPaid) * 100) / 100);
    b.totalBalance = Math.max(0, Math.round((b.totalPaid - b.totalBilled) * 100) / 100);
    b.totalPatients = b.clinicPatients + b.homeVisits;
  });
  return branchById;
};

const revenueReport = asyncHandler(async (req, res) => {
  const q = req.query;
  // Clinic-Home filter is patient-based and disjoint:
  //   Home   = money belonging to patients marked C/H = Home (+ legacy Home Visits),
  //   Clinic = everyone else (OP).
  // Each view therefore sums exactly to the full (no-ch) report.
  const chKey = q.ch ? String(q.ch).toLowerCase() : '';
  const chHome = chKey.startsWith('h');
  const chClinic = !!chKey && !chHome;
  const homeIds = await homePatientIds();

  const filter = buildVisitFilter(q);
  const txFilter = buildTxFilter(q);
  if (chKey) {
    const conds = chHome
      ? [{ patientId: { $in: homeIds } }, { homeVisitId: { $ne: null } }]
      : [{ patientId: { $nin: homeIds } }, { homeVisitId: null }];
    txFilter.$or = txFilter.$or ? [...txFilter.$or, ...conds] : conds;
  }
  const homeFilter = buildHomeVisitFilter(q);

  const visitScope = chHome ? { patient: { $in: homeIds } } : chClinic ? { patient: { $nin: homeIds } } : {};

  // Money already captured by PaymentTransactions (attribute once to that ledger).
  const [txSummary, txMethodAgg, coveredSets] = await Promise.all([
    PaymentTransaction.aggregate([
      { $match: txFilter },
      { $group: { _id: null, revenue: { $sum: '$amount' }, transactions: { $sum: 1 } } },
    ]),
    PaymentTransaction.aggregate([
      { $match: txFilter },
      {
        $group: {
          _id: { $ifNull: ['$paymentMethod', 'N/A'] },
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 },
          patients: { $addToSet: '$patientId' },
        },
      },
    ]),
    (async () => {
      const [courses, visits] = await Promise.all([
        PaymentTransaction.distinct('courseId', { ...txFilter, courseId: { $ne: null } }),
        PaymentTransaction.distinct('visitId', { ...txFilter, visitId: { $ne: null } }),
      ]);
      return { courses, visits };
    })(),
  ]);

  // Legacy OP fallback: visits whose money is NOT represented in PaymentTransactions.
  // Clinic/Home split follows the patient's C/H classification.
  const legacyMatch = {
    ...filter,
    'payment.advanced': { $gt: 0 },
    $or: [
      { courseId: null },
      { courseId: { $nin: coveredSets.courses } },
    ],
    _id: { $nin: coveredSets.visits },
  };
  if (chKey) legacyMatch.patient = visitScope.patient;
  const [legacySummary, legacyMethodAgg] = await Promise.all([
    Visit.aggregate([
      { $match: legacyMatch },
      {
        $group: {
          _id: null,
          totalBilled: { $sum: '$charges.total' },
          totalPaid: { $sum: '$payment.advanced' },
          totalDue: { $sum: '$payment.due' },
          transactions: { $sum: 1 },
          totalPatients: { $addToSet: '$patient' },
        },
      },
    ]),
    Visit.aggregate([
      { $match: legacyMatch },
      {
        $group: {
          _id: { $ifNull: ['$payment.methodName', 'N/A'] },
          revenue: { $sum: '$payment.advanced' },
          billed: { $sum: '$charges.total' },
          due: { $sum: '$payment.due' },
          transactions: { $sum: 1 },
          patients: { $addToSet: '$patient' },
        },
      },
    ]),
  ]);

  // OP billing (all visits matching the filter) — courses bill exactly once (day 1),
  // follow-ups are ₹0, additional charges add in only when explicitly billed.
  const visitBilledAgg = await Visit.aggregate([
    { $match: { ...filter, ...visitScope } },
    {
      $group: {
        _id: null,
        totalBilled: { $sum: '$charges.total' },
      },
    },
  ]);

  // Home Visits: actual money received (advance), billed (total), counted once.
  const homeMatch = chClinic ? { ...homeFilter, _id: { $in: [] } } : homeFilter;
  const [homeSummary, homeMethodAgg] = await Promise.all([
    HomeVisit.aggregate([
      { $match: homeMatch },
      {
        $group: {
          _id: null,
          totalBilled: { $sum: { $ifNull: ['$total', { $multiply: [{ $ifNull: ['$perSession', 0] }, { $ifNull: ['$sessions', 1] }] }] } },
          totalPaid: { $sum: { $ifNull: ['$advance', 0] } },
          totalDue: { $sum: { $ifNull: ['$due', 0] } },
          transactions: { $sum: 1 },
        },
      },
    ]),
    HomeVisit.aggregate([
      { $match: { ...homeMatch, paymentMethod: { $ne: null } } },
      {
        $group: {
          _id: { $ifNull: ['$paymentMethod', 'N/A'] },
          revenue: { $sum: { $ifNull: ['$advance', 0] } },
          billed: { $sum: { $ifNull: ['$total', 0] } },
          due: { $sum: { $ifNull: ['$due', 0] } },
          transactions: { $sum: 1 },
        },
      },
    ]),
  ]);

  // ---- Per-entity Due / Balance (never netted across patients) ----
  // For each billing entity below, due = MAX(billed − paid, 0) and
  // balance = MAX(paid − billed, 0); the totals are the SUM of those per-entity
  // values, so a patient who still owes and a patient with a credit balance both
  // appear instead of cancelling each other out.
  //   A) each Course        billed = its visits' charges (course billed once on day-1,
  //                                   follow-ups ₹0 + explicit additional charges);
  //                           paid   = its PaymentTransactions + initial advance.
  //   B) each non-course OP visit: billed = charges.total; paid = payment.advanced
  //                                (or its standalone PaymentTransactions when present).
  //   C) each Home Visit doc:      billed = total (or perSession × sessions); paid = advance.
  let entityDue = 0;
  let entityBalance = 0;

  // A) Course entities
  const courseVisMatch = { ...filter, ...visitScope, courseId: { $ne: null } };
  const courseTxMatch = { ...txFilter, courseId: { $ne: null } };
  const [courseIdsFromVisits, courseIdsFromTx] = await Promise.all([
    Visit.distinct('courseId', courseVisMatch),
    PaymentTransaction.distinct('courseId', courseTxMatch),
  ]);
  const courseIds = [
    ...new Set([
      ...(courseIdsFromVisits || []).map((x) => x.toString()),
      ...(courseIdsFromTx || []).map((x) => x.toString()),
    ]),
  ];
  if (courseIds.length) {
    const [courseDocs, courseVisitAgg, courseTxAgg] = await Promise.all([
      Course.find({ _id: { $in: courseIds } }).select('_id initialAdvance').lean(),
      Visit.aggregate([
        { $match: { ...courseVisMatch, courseId: { $in: courseIds } } },
        { $group: { _id: '$courseId', billed: { $sum: '$charges.total' }, advanced: { $sum: '$payment.advanced' } } },
      ]),
      PaymentTransaction.aggregate([
        { $match: { ...courseTxMatch, courseId: { $in: courseIds } } },
        { $group: { _id: '$courseId', paid: { $sum: '$amount' } } },
      ]),
    ]);
    const visitByCourse = {};
    courseVisitAgg.forEach((r) => (visitByCourse[r._id.toString()] = r));
    const txByCourse = {};
    courseTxAgg.forEach((r) => (txByCourse[r._id.toString()] = r));
    courseDocs.forEach((c) => {
      const key = c._id.toString();
      const billed = round2(visitByCourse[key]?.billed || 0);
      const hasTx = !!txByCourse[key];
      const paid = hasTx ? round2((txByCourse[key].paid || 0) + (c.initialAdvance || 0)) : round2(visitByCourse[key]?.advanced || 0);
      entityDue += Math.max(0, billed - paid);
      entityBalance += Math.max(0, paid - billed);
    });
  }

  // B) Non-course OP visits (each visit is a billing entity)
  const standaloneTxAgg = await PaymentTransaction.aggregate([
    { $match: { ...txFilter, courseId: null, visitId: { $ne: null } } },
    { $group: { _id: '$visitId', paid: { $sum: '$amount' } } },
  ]);
  const paidByVisit = {};
  standaloneTxAgg.forEach((r) => (paidByVisit[r._id.toString()] = round2(r.paid || 0)));
  const nonCourseVisits = await Visit.find({ ...filter, ...visitScope, $or: [{ courseId: null }, { courseId: { $exists: false } }] })
    .select('charges.total payment.advanced')
    .lean();
  nonCourseVisits.forEach((v) => {
    const billed = round2(v.charges?.total || 0);
    const paid = paidByVisit[v._id.toString()] ?? round2(v.payment?.advanced || 0);
    if (!billed && !paid) return;
    entityDue += Math.max(0, billed - paid);
    entityBalance += Math.max(0, paid - billed);
  });

  // C) Home Visit documents (each document is a billing entity)
  const homeDocs = await HomeVisit.aggregate([
    { $match: homeMatch },
    {
      $project: {
        billed: {
          $ifNull: ['$total', { $multiply: [{ $ifNull: ['$perSession', 0] }, { $ifNull: ['$sessions', 1] }] }],
        },
        paid: { $ifNull: ['$advance', 0] },
      },
    },
  ]);
  homeDocs.forEach((h) => {
    const billed = round2(h.billed);
    const paid = round2(h.paid);
    if (!billed && !paid) return;
    entityDue += Math.max(0, billed - paid);
    entityBalance += Math.max(0, paid - billed);
  });

  // ---- Summary ----
  const txS = txSummary[0] || {};
  const legS = legacySummary[0] || {};
  const homeS = homeSummary[0] || {};
  const billedFromVisits = visitBilledAgg[0]?.totalBilled || 0;
  // Patients = patient REGISTRATION records in scope (never patients-in-visits:
  // a follow-up/course-day/payment must not add a patient). Excludes archived.
  const totalPatients = await Patient.countDocuments(
    await registrationMatch(parseRange(q.date || q.from, q.date || q.to), q.branch, chHome ? 'home' : chClinic ? 'clinic' : '')
  );

  const totalBilled = Math.max(0, Math.round((billedFromVisits + (homeS.totalBilled || 0)) * 100) / 100);
  const totalPaid = Math.max(0, Math.round(((txS.revenue || 0) + (legS.totalPaid || 0) + (homeS.totalPaid || 0)) * 100) / 100);
  // Due/Balance aggregate per billing entity (see per-entity block above) so both a
  // patient's outstanding amount AND a patient's un-used credit show up independently.
  const totalDue = round2(entityDue);
  const totalBalance = round2(entityBalance);
  const totalTransactions = (txS.transactions || 0) + (legS.transactions || 0) + (homeS.transactions || 0);

  // ---- Branch rows ----
  // OP money is attributed to each patient's REGISTRATION branch (the same
  // all-time live-registration set as the Branch Reports cards), so an archived
  // registration drops out of money AND patients together, and a payment can
  // never land on a different branch than its patient's. Activity date-scoping
  // still comes from the visit/payment filters.
  const { attribution } = await registrationDataByBranch();
  const branchById = await branchFinancialMap({
    visitFilter: filter,
    visitScope,
    txFilter,
    homeFilter,
    chHome,
    coveredSets,
    attribution,
  });
  const branchRows = Object.values(branchById);
  // The Patients / Clinic / Home figures on every branch row are REGISTRATION
  // counts (the same ledger as the Branch Reports cards), never "patients who
  // happened to pay in this scope". Money fields stay untouched.
  const regCounts = (await registrationDataByBranch(parseRange(q.date || q.from, q.date || q.to))).counts;
  branchRows.forEach((b) => {
    const rc = regCounts.get(b.branchId ? b.branchId.toString() : 'none');
    const clinic = rc?.clinic ?? 0;
    const home = rc?.home ?? 0;
    b.clinicPatients = chHome ? 0 : clinic;
    b.homeVisits = chClinic ? 0 : home;
    b.totalPatients = chHome ? home : chClinic ? clinic : rc?.patients ?? 0;
  });

  // ---- Method rows ----
  const methodById = {};
  const putMethod = (name, patch) => {
    const key = name && name !== 'N/A' ? name : 'N/A';
    if (!methodById[key]) {
      methodById[key] = { methodName: key, transactions: 0, revenue: 0, billed: 0, due: 0, totalPatients: 0 };
    }
    Object.assign(methodById[key], patch);
  };
  legacyMethodAgg.forEach((r) => {
    putMethod(r._id, {
      transactions: r.transactions,
      revenue: Math.round(r.revenue * 100) / 100,
      billed: Math.round(r.billed * 100) / 100,
      due: Math.round(r.due * 100) / 100,
      totalPatients: r.patients.length,
    });
  });
  txMethodAgg.forEach((r) => {
    putMethod(r._id, {
      transactions: (methodById[r._id]?.transactions || 0) + r.transactions,
      revenue: (methodById[r._id]?.revenue || 0) + Math.round(r.revenue * 100) / 100,
      totalPatients: Math.max(methodById[r._id]?.totalPatients || 0, r.patients.length),
    });
  });
  homeMethodAgg.forEach((r) => {
    putMethod(r._id, {
      transactions: (methodById[r._id]?.transactions || 0) + r.transactions,
      revenue: (methodById[r._id]?.revenue || 0) + Math.round(r.revenue * 100) / 100,
      billed: (methodById[r._id]?.billed || 0) + Math.round(r.billed * 100) / 100,
      due: (methodById[r._id]?.due || 0) + Math.round(r.due * 100) / 100,
    });
  });
  const methodRows = Object.values(methodById).map((m) => ({ ...m, due: Math.max(0, Math.round(m.due * 100) / 100) }));

  res.status(200).json(
    new ApiResponse(200, {
      summary: {
        totalBilled,
        totalPaid,
        totalDue,
        totalBalance,
        totalPatients,
        totalTransactions,
      },
      branchRows,
      methodRows,
    })
  );
});

// ---------- Day-wise revenue analytics (dashboard) ----------
// Each row = one calendar day with:
//   date       - day (YYYY-MM-DD)
//   billed     - money billed that day (course billed once day-1, follow-ups ₹0, +
//                 explicit additional charges billed that day, + home entries billed that day)
//   received   - actual money received that day (PaymentTransaction by paymentDate +
//                 legacy OP advanced not covered by a transaction + home visit advance)
//   transactions - count of actual financial payments that day
//   patients   - distinct patients billed that day (clinic patients + home patients)
//   due        - CUMULATIVE (running billed - running received up to & incl. that day)
//   balance    - CUMULATIVE excess (running received - running billed), never negative
// Billing date is the bill (visitDate / createdAt) date; payment date is the actual
// payment (paymentDate) date. A follow-up day never re-bills, so it never inflates Due.
// C/H filter (ch = All | Clinic | Home) is patient-based.
const dayWiseRevenue = asyncHandler(async (req, res) => {
  const q = req.query;
  const chKey = String(q.ch || '').toLowerCase();
  const chHome = chKey === 'home';
  const chClinic = chKey === 'clinic';
  const homeIds = await homePatientIds();

  const branchFilter = (field) => {
    const f = {};
    if (q.branch && mongoose.isValidObjectId(q.branch)) f[field] = new mongoose.Types.ObjectId(q.branch);
    return f;
  };

  const txRange = parseRange(q.date || q.from, q.date || q.to);
  const visitRange = parseRange(q.date || q.from, q.date || q.to);
  const homeRange = parseRange(q.date || q.from, q.date || q.to);

  // Patients shown per row / in the summary = patient REGISTRATION records grouped
  // by their local registration day (same ledger as the dashboard Today's Patients
  // card and the Branch Reports cards). Follow-ups may bill ₹0 and payments may
  // occur, but neither ever adds a patient.
  const regDays = await registrationByDay(homeRange, q.branch, chHome ? 'home' : chClinic ? 'clinic' : '');
  const regDayMap = {};
  regDays.forEach((r) => (regDayMap[r._id] = r));

  // What dates should we enumerate? If a single date (date or from==to) -> 1 day.
  // Else enumerate every day between from..to.
  const daySet = new Map();
  const addDay = (iso) => {
    if (!daySet.has(iso)) {
      daySet.set(iso, { date: iso, billed: 0, received: 0, transactions: 0, patients: 0, clinicPatients: 0, homeVisits: 0 });
    }
  };

  const startStr = q.date || q.from;
  const endStr = q.date || q.to;
  const wide = startStr && endStr && startStr !== endStr;

  if (startStr) addDay(String(startStr).slice(0, 10));

  // ---- Clinic OP billing (visits by non-Home patients) ----
  const clinicMatch = {
    ...visitRangeGrand(visitRange),
    ...branchFilter('branch'),
    ...(chHome ? { _id: { $in: [] } } : { patient: { $nin: homeIds } }),
  };
  const clinicBilled = await Visit.aggregate([
    { $match: clinicMatch },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$visitDate' } },
        billed: { $sum: '$charges.total' },
        patients: { $addToSet: '$patient' },
      },
    },
  ]);
  const clinicBilledMap = {};
  clinicBilled.forEach((r) => { clinicBilledMap[r._id] = r; });

  // ---- Home-patient OP billing (visits by Home patients) ----
  const homeVisitMatch = {
    ...visitRangeGrand(visitRange),
    ...branchFilter('branch'),
    ...(chClinic ? { _id: { $in: [] } } : { patient: { $in: homeIds } }),
  };
  const homeVisitBilled = await Visit.aggregate([
    { $match: homeVisitMatch },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$visitDate' } },
        billed: { $sum: '$charges.total' },
        patients: { $addToSet: '$patient' },
      },
    },
  ]);
  const homeVisitBilledMap = {};
  homeVisitBilled.forEach((r) => { homeVisitBilledMap[r._id] = r; });

  // ---- Legacy HomeVisit documents (always Home) ----
  const homeFilter2 = {
    ...(homeRange.$gte || homeRange.$lte ? { createdAt: homeRange } : {}),
    ...branchFilter('branch'),
    ...(chClinic ? { _id: { $in: [] } } : {}),
  };
  const homeAgg = await HomeVisit.aggregate([
    { $match: homeFilter2 },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        billed: { $sum: { $ifNull: ['$total', { $multiply: [{ $ifNull: ['$perSession', 0] }, { $ifNull: ['$sessions', 1] }] }] } },
        advance: { $sum: { $ifNull: ['$advance', 0] } },
        transactions: { $sum: 1 },
        homePatients: { $addToSet: '$patientName' },
      },
    },
  ]);
  const homeMap = {};
  homeAgg.forEach((r) => { homeMap[r._id] = r; });

  // ---- Payments from actual transactions (paymentDate) ----
  const coveredTxIds = await PaymentTransaction.distinct('visitId');
  const coveredCourseIds = await PaymentTransaction.distinct('courseId');

  const txFilter2 = {
    ...(txRange.$gte || txRange.$lte ? { paymentDate: txRange } : {}),
    ...branchFilter('branchId'),
    ...(chHome ? { patientId: { $in: homeIds } } : chClinic ? { patientId: { $nin: homeIds } } : {}),
  };
  const txAgg = await PaymentTransaction.aggregate([
    { $match: txFilter2 },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$paymentDate' } },
        received: { $sum: '$amount' },
        transactions: { $sum: 1 },
        patients: { $addToSet: '$patientId' },
      },
    },
  ]);
  const txMap = {};
  txAgg.forEach((r) => { txMap[r._id] = r; });

  // ---- Legacy OP payments not covered by a transaction (visitDate) ----
  const legacyMatch = {
    ...visitRangeGrand(visitRange),
    ...branchFilter('branch'),
    ...(chHome ? { patient: { $in: homeIds } } : chClinic ? { patient: { $nin: homeIds } } : {}),
    'payment.advanced': { $gt: 0 },
    $or: [{ courseId: null }, { courseId: { $nin: coveredCourseIds } }],
    _id: { $nin: coveredTxIds },
  };
  const legacyAgg = await Visit.aggregate([
    { $match: legacyMatch },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$visitDate' } },
        received: { $sum: '$payment.advanced' },
        transactions: { $sum: 1 },
      },
    },
  ]);
  const legacyMap = {};
  legacyAgg.forEach((r) => { legacyMap[r._id] = r; });

  // ---- Enumerate range ----
  if (wide) {
    const s = new Date(`${startStr}T00:00:00`);
    const e = new Date(`${endStr}T00:00:00`);
    if (!Number.isNaN(s.getTime()) && !Number.isNaN(e.getTime())) {
      const cur = new Date(s);
      while (cur <= e) {
        addDay(cur.toISOString().slice(0, 10));
        cur.setDate(cur.getDate() + 1);
      }
    }
  }

  // Merge per-day
  const allDates = new Set([
    ...Object.keys(clinicBilledMap),
    ...Object.keys(homeVisitBilledMap),
    ...Object.keys(txMap),
    ...Object.keys(legacyMap),
    ...Object.keys(homeMap),
    ...Object.keys(regDayMap),
    ...daySet.keys(),
  ]);
  allDates.forEach((d) => addDay(d));

  let cumBilled = 0;
  let cumReceived = 0;
  const rows = [];
  [...daySet.keys()].sort().forEach((d) => {
    const r = daySet.get(d);
    const cb = clinicBilledMap[d];
    const hb = homeVisitBilledMap[d];
    const tx = txMap[d];
    const leg = legacyMap[d];
    const hm = homeMap[d];
    const reg = regDayMap[d] || { patients: 0, clinic: 0, home: 0 };

    const billed = (cb?.billed || 0) + (hb?.billed || 0) + (hm?.billed || 0);
    const received = (tx?.received || 0) + (leg?.received || 0) + (hm?.advance || 0);
    const transactions = (tx?.transactions || 0) + (leg?.transactions || 0) + (hm?.transactions || 0);

    r.billed = Math.round(billed * 100) / 100;
    r.received = Math.round(received * 100) / 100;
    r.transactions = transactions;
    r.patients = reg.patients || 0;
    r.clinicPatients = reg.clinic || 0;
    r.homeVisits = reg.home || 0;

    cumBilled += r.billed;
    cumReceived += r.received;

    rows.push({
      date: r.date,
      billed: r.billed,
      received: r.received,
      due: Math.round(Math.max(0, cumBilled - cumReceived) * 100) / 100,
      balance: Math.round(Math.max(0, cumReceived - cumBilled) * 100) / 100,
      patients: r.patients,
      clinicPatients: r.clinicPatients,
      homeVisits: r.homeVisits,
      transactions: r.transactions,
      cumBilled: Math.round(cumBilled * 100) / 100,
      cumReceived: Math.round(cumReceived * 100) / 100,
    });
  });

  const totalBilled = rows.reduce((a, r) => a + r.billed, 0);
  const totalReceived = rows.reduce((a, r) => a + r.received, 0);
  const last = rows[rows.length - 1];

  res.status(200).json(
    new ApiResponse(200, {
      rows,
      summary: {
        totalBilled: Math.round(totalBilled * 100) / 100,
        totalReceived: Math.round(totalReceived * 100) / 100,
        totalDue: last ? last.due : 0,
        totalBalance: last ? last.balance : 0,
        // Distinct patient REGISTRATIONS in the entire date scope (each patient
        // has exactly one registration day, so this equals SUM(row patients)).
        totalPatients: regDays.reduce((a, r) => a + (r.patients || 0), 0),
        totalTransactions: rows.reduce((a, r) => a + r.transactions, 0),
        startDate: startStr || null,
        endDate: endStr || null,
      },
    })
  );
});

function visitRangeGrand(range) {
  return range.$gte || range.$lte ? { visitDate: range } : {};
}

module.exports = { branchList, branchDetail, revenueReport, dayWiseRevenue };
