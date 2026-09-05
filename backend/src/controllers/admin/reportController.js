const mongoose = require('mongoose');
const Visit = require('../../models/Visit');
const HomeVisit = require('../../models/HomeVisit');
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

// ---------- Daily register: Clinic + Home Visits = Total (per date, per branch) ----------
// Clinic/OP count comes from Visit documents (visitDate), Home Visits from HomeVisit
// documents (createdAt date). Purely operational counts, not revenue.
const dailyRegister = asyncHandler(async (req, res) => {
  const { from, to, branch } = req.query;
  const range = parseRange(from, to);

  const clinicMatch = {};
  if (range.$gte || range.$lte) clinicMatch.visitDate = range;
  if (branch && mongoose.isValidObjectId(branch)) clinicMatch.branch = new mongoose.Types.ObjectId(branch);

  const homeMatch = {};
  if (range.$gte || range.$lte) homeMatch.createdAt = range;
  if (branch && mongoose.isValidObjectId(branch)) homeMatch.branch = new mongoose.Types.ObjectId(branch);

  const [clinicAgg, homeAgg] = await Promise.all([
    Visit.aggregate([
      { $match: clinicMatch },
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
    HomeVisit.aggregate([
      { $match: homeMatch },
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
  homeAgg.forEach((r) => { if (r._id.branch) branchIds.add(r._id.branch.toString()); });

  const branchNames = {};
  if (branchIds.size) {
    (await Branch.find({ _id: { $in: [...branchIds] } }).select('name')).forEach(
      (b) => (branchNames[b._id.toString()] = b.name)
    );
  }

  const map = {};
  clinicAgg.forEach((r) => {
    const key = `${r._id.date}|${r._id.branch ? r._id.branch.toString() : 'none'}`;
    map[key] = { date: r._id.date, branchId: r._id.branch || null, clinic: r.clinic, home: 0 };
  });
  homeAgg.forEach((r) => {
    const key = `${r._id.date}|${r._id.branch ? r._id.branch.toString() : 'none'}`;
    if (map[key]) map[key].home += r.home;
    else map[key] = { date: r._id.date, branchId: r._id.branch || null, clinic: 0, home: r.home };
  });

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

module.exports = { dailyRegister, staffActivity, staffActivityDetail };
