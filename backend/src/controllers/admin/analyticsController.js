const mongoose = require('mongoose');
const Patient = require('../../models/Patient');
const Visit = require('../../models/Visit');
const HomeVisit = require('../../models/HomeVisit');
const PaymentTransaction = require('../../models/PaymentTransaction');
const Branch = require('../../models/Branch');
const ApiResponse = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
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

// ---------- Branch list with per-branch aggregates ----------
const branchList = asyncHandler(async (req, res) => {
  const filter = buildVisitFilter(req.query);

  const agg = await Visit.aggregate([
    { $match: filter },
    {
      $group: {
        _id: '$branch',
        totalOPVisits: { $sum: 1 },
        totalPatients: { $addToSet: '$patient' },
        totalBilled: { $sum: '$charges.total' },
        totalPaid: { $sum: '$payment.advanced' },
        totalDue: { $sum: '$payment.due' },
      },
    },
    {
      $project: {
        _id: 1,
        totalOPVisits: 1,
        totalPatients: { $size: { $ifNull: ['$totalPatients', []] } },
        totalBilled: { $round: ['$totalBilled', 2] },
        totalPaid: { $round: ['$totalPaid', 2] },
        totalDue: { $round: ['$totalDue', 2] },
      },
    },
  ]);

  const aggById = {};
  agg.forEach((a) => {
    if (a._id) aggById[a._id.toString()] = a;
  });

  const branches = await Branch.find({ isActive: true }).sort({ order: 1, name: 1 });
  const rows = branches.map((b) => {
    const a = aggById[b._id.toString()] || {};
    return {
      _id: b._id,
      name: b.name,
      area: b.area,
      totalPatients: a.totalPatients || 0,
      totalOPVisits: a.totalOPVisits || 0,
      totalBilled: a.totalBilled || 0,
      totalPaid: a.totalPaid || 0,
      totalDue: a.totalDue || 0,
    };
  });

  res.status(200).json(new ApiResponse(200, rows));
});

// ---------- Single branch detail: stats + visit/patient list ----------
const branchDetail = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid branch id');
  const branch = await Branch.findById(req.params.id);
  if (!branch) throw new ApiError(404, 'Branch not found');

  const filter = { branch: new mongoose.Types.ObjectId(req.params.id), ...buildVisitFilter(req.query) };

  const [sum, visits] = await Promise.all([
    Visit.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalOPVisits: { $sum: 1 },
          totalPatients: { $addToSet: '$patient' },
          totalBilled: { $sum: '$charges.total' },
          totalPaid: { $sum: '$payment.advanced' },
          totalDue: { $sum: '$payment.due' },
        },
      },
    ]),
    Visit.find(filter)
      .sort({ visitDate: -1, createdAt: -1 })
      .populate('patient', 'uhid name mobile')
      .populate('department', 'name')
      .populate('doctor', 'name')
      .populate('payment.method', 'name'),
  ]);

  const s = sum[0] || {};
  const stat = {
    totalPatients: (s.totalPatients || []).length,
    totalOPVisits: s.totalOPVisits || 0,
    totalBilled: s.totalBilled || 0,
    totalPaid: s.totalPaid || 0,
    totalDue: s.totalDue || 0,
  };

  res.status(200).json(
    new ApiResponse(200, {
      branch: { _id: branch._id, name: branch.name, area: branch.area, phone: branch.phone },
      stats: stat,
      visits,
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

const revenueReport = asyncHandler(async (req, res) => {
  const q = req.query;
  // Clinic-Home filter is service-based and disjoint:
  //   Home   = money received via Home Visits only,
  //   Clinic = all the rest (OP).
  // Each view therefore sums exactly to the full (no-ch) report.
  const chKey = q.ch ? String(q.ch).toLowerCase() : '';
  const chHome = chKey.startsWith('h');
  const chClinic = !!chKey && !chHome;

  const filter = buildVisitFilter(q);
  const txFilter = buildTxFilter(q);
  if (chHome) txFilter.homeVisitId = { $ne: null };
  if (chClinic) txFilter.homeVisitId = null;
  const homeFilter = buildHomeVisitFilter(q);

  // Money already captured by PaymentTransactions (attribute once to that ledger).
  const [txSummary, txBranchAgg, txMethodAgg, coveredSets] = await Promise.all([
    PaymentTransaction.aggregate([
      { $match: txFilter },
      { $group: { _id: null, revenue: { $sum: '$amount' }, transactions: { $sum: 1 } } },
    ]),
    PaymentTransaction.aggregate([
      { $match: txFilter },
      {
        $group: {
          _id: '$branchId',
          revenue: { $sum: '$amount' },
          transactions: { $sum: 1 },
          patients: { $addToSet: '$patientId' },
        },
      },
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
      return { courses: new Set(courses.map(String)), visits: new Set(visits.map(String)) };
    })(),
  ]);

  // Legacy OP fallback: visits whose money is NOT represented in PaymentTransactions.
  // Apply the Clinic/Home split: legacy OP money belongs to Clinic; Home money is its own.
  const legacyMatch = {
    ...filter,
    'payment.advanced': { $gt: 0 },
    $or: [
      { courseId: null },
      { courseId: { $nin: [...coveredSets.courses] } },
    ],
    _id: { $nin: [...coveredSets.visits] },
  };
  if (chHome) legacyMatch._id = { $in: [] };
  const [legacySummary, legacyBranchAgg, legacyMethodAgg] = await Promise.all([
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
          _id: '$branch',
          totalBilled: { $sum: '$charges.total' },
          totalPaid: { $sum: '$payment.advanced' },
          totalDue: { $sum: '$payment.due' },
          transactions: { $sum: 1 },
          patients: { $addToSet: '$patient' },
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
  const [visitBilledAgg, visitPatientsAgg] = await Promise.all([
    Visit.aggregate([
      { $match: chHome ? { _id: { $in: [] } } : filter },
      {
        $group: {
          _id: null,
          totalBilled: { $sum: '$charges.total' },
        },
      },
    ]),
    Visit.aggregate([
      { $match: chHome ? { _id: { $in: [] } } : filter },
      { $group: { _id: null, patients: { $addToSet: '$patient' } } },
    ]),
  ]);

  // Home Visits: actual money received (advance), billed (total), counted once.
  const homeMatch = chClinic ? { ...homeFilter, _id: { $in: [] } } : homeFilter;
  const [homeSummary, homeBranchAgg, homeMethodAgg] = await Promise.all([
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
      { $match: homeMatch },
      {
        $group: {
          _id: '$branch',
          totalBilled: { $sum: { $ifNull: ['$total', 0] } },
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

  // ---- Summary ----
  const txS = txSummary[0] || {};
  const legS = legacySummary[0] || {};
  const homeS = homeSummary[0] || {};
  const billedFromVisits = visitBilledAgg[0]?.totalBilled || 0;
  let totalPatients = (visitPatientsAgg[0]?.patients || []).length;
  if (chHome) {
    // Home view: patient count = distinct patients in the filtered home visits.
    const homePatients = await HomeVisit.aggregate([
      { $match: homeMatch },
      { $group: { _id: '$patient', n: { $sum: 1 } } },
      { $group: { _id: null, patients: { $sum: 1 } } },
    ]);
    totalPatients = homePatients[0]?.patients || 0;
  }

  const totalBilled = Math.max(0, Math.round((billedFromVisits + (homeS.totalBilled || 0)) * 100) / 100);
  const totalPaid = Math.max(0, Math.round(((txS.revenue || 0) + (legS.totalPaid || 0) + (homeS.totalPaid || 0)) * 100) / 100);
  const totalDue = Math.max(0, Math.round((totalBilled - totalPaid) * 100) / 100);
  const totalTransactions = (txS.transactions || 0) + (legS.transactions || 0) + (homeS.transactions || 0);

  // ---- Branch rows ----
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
  // OP billed + legacy paid + clinic patient counts.
  const visitBranchBilled = await Visit.aggregate([
    { $match: chHome ? { _id: { $in: [] } } : filter },
    {
      $group: {
        _id: '$branch',
        billed: { $sum: '$charges.total' },
        patients: { $addToSet: '$patient' },
      },
    },
  ]);
  visitBranchBilled.forEach((r) => {
    putBranch(r._id, { totalBilled: Math.round(r.billed * 100) / 100, clinicPatients: r.patients.length, totalPatients: r.patients.length });
  });

  legacyBranchAgg.forEach((r) => {
    const key = r._id ? r._id.toString() : 'none';
    putBranch(r._id, { totalPaid: (branchById[key]?.totalPaid || 0) + Math.round(r.totalPaid * 100) / 100, transactions: (branchById[key]?.transactions || 0) + r.transactions });
  });
  txBranchAgg.forEach((r) => {
    putBranch(r._id, { totalPaid: (branchById[r._id ? r._id.toString() : 'none']?.totalPaid || 0) + Math.round(r.revenue * 100) / 100, transactions: (branchById[r._id ? r._id.toString() : 'none']?.transactions || 0) + r.transactions });
  });
  homeBranchAgg.forEach((r) => {
    const key = r._id ? r._id.toString() : 'none';
    putBranch(r._id, {
      totalBilled: (branchById[key]?.totalBilled || 0) + Math.round(r.totalBilled * 100) / 100,
      totalPaid: (branchById[key]?.totalPaid || 0) + Math.round(r.totalPaid * 100) / 100,
      totalDue: Math.max(0, Math.round(r.totalDue * 100) / 100),
      transactions: (branchById[key]?.transactions || 0) + r.transactions,
      homeVisits: (branchById[key]?.homeVisits || 0) + r.transactions,
    });
    if (chHome) {
      branchById[key].clinicPatients = 0;
      branchById[key].totalPatients = r.transactions;
    }
  });
  const branchRows = Object.values(branchById).map((b) => ({
    ...b,
    totalDue: Math.max(0, Math.round((b.totalBilled - b.totalPaid) * 100) / 100),
    totalPatients: b.clinicPatients + b.homeVisits,
  }));

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
        totalPatients,
        totalTransactions,
      },
      branchRows,
      methodRows,
    })
  );
});

module.exports = { branchList, branchDetail, revenueReport };
