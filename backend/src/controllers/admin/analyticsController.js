const mongoose = require('mongoose');
const Patient = require('../../models/Patient');
const Visit = require('../../models/Visit');
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
const revenueReport = asyncHandler(async (req, res) => {
  const filter = buildVisitFilter(req.query);

  const [summary] = await Visit.aggregate([
    { $match: filter },
    {
      $group: {
        _id: null,
        totalBilled: { $sum: '$charges.total' },
        totalPaid: { $sum: '$payment.advanced' },
        totalDue: { $sum: '$payment.due' },
        totalTransactions: { $sum: 1 },
        totalPatients: { $addToSet: '$patient' },
      },
    },
    {
      $project: {
        totalBilled: { $round: ['$totalBilled', 2] },
        totalPaid: { $round: ['$totalPaid', 2] },
        totalDue: { $round: ['$totalDue', 2] },
        totalTransactions: 1,
        totalPatients: { $size: { $ifNull: ['$totalPatients', []] } },
      },
    },
  ]);

  const branchRows = await Visit.aggregate([
    { $match: filter },
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
    {
      $project: {
        branchId: '$_id',
        totalBilled: { $round: ['$totalBilled', 2] },
        totalPaid: { $round: ['$totalPaid', 2] },
        totalDue: { $round: ['$totalDue', 2] },
        transactions: 1,
        totalPatients: { $size: { $ifNull: ['$patients', []] } },
      },
    },
  ]);

  const branchNames = {};
  (await Branch.find({ _id: { $in: branchRows.map((r) => r.branchId).filter(Boolean) } }).select('name')).forEach(
    (b) => (branchNames[b._id.toString()] = b.name)
  );

  const methodRows = await Visit.aggregate([
    { $match: filter },
    {
      $group: {
        _id: { $ifNull: ['$payment.methodName', 'N/A'] },
        transactions: { $sum: 1 },
        revenue: { $sum: '$payment.advanced' },
        billed: { $sum: '$charges.total' },
        due: { $sum: '$payment.due' },
        patients: { $addToSet: '$patient' },
      },
    },
    {
      $project: {
        methodName: '$_id',
        transactions: 1,
        revenue: { $round: ['$revenue', 2] },
        billed: { $round: ['$billed', 2] },
        due: { $round: ['$due', 2] },
        totalPatients: { $size: { $ifNull: ['$patients', []] } },
      },
    },
    { $sort: { transactions: -1 } },
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      summary: {
        totalBilled: (summary && summary.totalBilled) || 0,
        totalPaid: (summary && summary.totalPaid) || 0,
        totalDue: (summary && summary.totalDue) || 0,
        totalPatients: (summary && summary.totalPatients) || 0,
        totalTransactions: (summary && summary.totalTransactions) || 0,
      },
      branchRows: branchRows.map((r) => ({
        branchId: r.branchId,
        branchName: (r.branchId && branchNames[r.branchId.toString()]) || 'Unassigned',
        totalBilled: r.totalBilled,
        totalPaid: r.totalPaid,
        totalDue: r.totalDue,
        transactions: r.transactions,
        totalPatients: r.totalPatients,
      })).sort((a, b) => b.totalBilled - a.totalBilled),
      methodRows,
    })
  );
});

module.exports = { branchList, branchDetail, revenueReport };
