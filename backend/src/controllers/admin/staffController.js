const mongoose = require('mongoose');
const Staff = require('../../models/Staff');
const Visit = require('../../models/Visit');
const HomeVisit = require('../../models/HomeVisit');
const Patient = require('../../models/Patient');
const Course = require('../../models/Course');
const PaymentTransaction = require('../../models/PaymentTransaction');
const Branch = require('../../models/Branch');
const ApiError = require('../../utils/ApiError');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const HOME_CH_RE = /^\s*home\s*$/i;

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

// ---------- Staff registry (Admin → Staff management) ----------
// Search, paginate and list staff members. Soft-deleted staff are excluded unless
// includeInactive=1. Deleting a staff member never touches their historical records.
const listStaffs = asyncHandler(async (req, res) => {
  const { search, page = 1, limit = 20, includeInactive } = req.query;
  const query = {};
  if (includeInactive !== '1') query.isActive = true;
  if (search && String(search).trim()) {
    const q = String(search).trim();
    query.$or = [
      { name: { $regex: q, $options: 'i' } },
      { role: { $regex: q, $options: 'i' } },
      { mobile: { $regex: q, $options: 'i' } },
      { email: { $regex: q, $options: 'i' } },
    ];
  }

  const total = await Staff.countDocuments(query);
  const staff = await Staff.find(query)
    .sort({ isActive: -1, name: 1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .populate('branch', 'name');

  const branchIds = new Set(
    staff.filter((s) => s.branch).map((s) => s.branch._id ? s.branch._id.toString() : s.branch.toString())
  );
  let branchNames = {};
  if (branchIds.size) {
    (await Branch.find({ _id: { $in: [...branchIds] } }).select('name')).forEach(
      (b) => (branchNames[b._id.toString()] = b.name)
    );
  }

  const rows = staff.map((s) => ({
    _id: s._id,
    name: s.name,
    role: s.role,
    mobile: s.mobile,
    email: s.email,
    branchId: s.branch ? (s.branch._id ? s.branch._id : s.branch) : null,
    branchName: s.branch && s.branch.name ? s.branch.name : (s.branch ? branchNames[s.branch.toString()] || 'Unassigned' : 'Unassigned'),
    isActive: s.isActive,
    createdAt: s.createdAt,
  }));

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

// ---------- Create a staff member ----------
const createStaff = asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const role = String(req.body.role || 'Receptionist').trim();
  const mobile = String(req.body.mobile || '').trim();
  const email = String(req.body.email || '').trim();

  if (!name) throw new ApiError(400, 'Staff name is required');
  const duplicate = await Staff.findOne({ name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
  if (duplicate) throw new ApiError(409, `Staff member "${name}" already exists`);

  const staff = await Staff.create({
    name,
    role,
    mobile,
    email,
    branch: req.body.branch && mongoose.isValidObjectId(req.body.branch) ? req.body.branch : null,
    createdBy: req.user._id || null,
  });

  res.status(201).json(new ApiResponse(201, (await Staff.findById(staff._id).populate('branch', 'name')), 'Staff member added'));
});

// ---------- Get one staff member ----------
const getStaff = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid staff id');
  const staff = await Staff.findById(req.params.id).populate('branch', 'name');
  if (!staff) throw new ApiError(404, 'Staff member not found');
  res.status(200).json(new ApiResponse(200, staff));
});

// ---------- Update a staff member in place ----------
const updateStaff = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid staff id');
  const staff = await Staff.findById(req.params.id);
  if (!staff) throw new ApiError(404, 'Staff member not found');
  const name = String(req.body.name ?? staff.name).trim();
  if (!name) throw new ApiError(400, 'Staff name is required');
  const duplicate = await Staff.findOne({ _id: { $ne: staff._id }, name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } });
  if (duplicate) throw new ApiError(409, `Staff member "${name}" already exists`);
  staff.name = name;
  if (req.body.role !== undefined) staff.role = String(req.body.role).trim() || 'Receptionist';
  if (req.body.mobile !== undefined) staff.mobile = String(req.body.mobile).trim();
  if (req.body.email !== undefined) staff.email = String(req.body.email).trim();
  if (req.body.branch !== undefined) {
    staff.branch = req.body.branch && mongoose.isValidObjectId(req.body.branch) ? req.body.branch : null;
  }
  if (req.body.isActive !== undefined) staff.isActive = Boolean(req.body.isActive);
  await staff.save();
  res.status(200).json(new ApiResponse(200, await Staff.findById(staff._id).populate('branch', 'name'), 'Staff member updated'));
});

// ---------- Soft delete (deactivate) a staff member ----------
// Historical patient / visit / course / payment records keep their snapshot names and
// are never touched. The staff member stops appearing in the autocomplete.
const softDeleteStaff = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid staff id');
  const staff = await Staff.findById(req.params.id);
  if (!staff) throw new ApiError(404, 'Staff member not found');

  const nowActive = !staff.isActive;
  staff.isActive = nowActive;
  await staff.save();

  res.status(200).json(
    new ApiResponse(200, { _id: staff._id, isActive: staff.isActive }, nowActive ? 'Staff member activated' : 'Staff member deactivated')
  );
});

// ---------- Per-staff analytics detail ----------
// One row per record (visit / home visit / course / new patient / payment) linked to the
// staff member. New records link by staffId; legacy portal records match by the stored
// createdByName snapshot (or therapist for home visits), so historical data keeps working.
const staffAnalyticsDetail = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid staff id');
  const staff = await Staff.findById(req.params.id);
  if (!staff) throw new ApiError(404, 'Staff member not found');

  const { from, to, branch } = req.query;
  const range = parseRange(from, to);
  const branchId = branch && mongoose.isValidObjectId(branch) ? new mongoose.Types.ObjectId(branch) : null;

  const staffName = staff.name;
  const ownerWhere = [{ staffId: staff._id }, { createdByName: staffName }];

  const visitMatch = {
    $or: ownerWhere,
    ...(range.$gte || range.$lte ? { visitDate: range } : {}),
    ...(branchId ? { branch: branchId } : {}),
  };
  const courseMatch = {
    $or: ownerWhere,
    ...(range.$gte || range.$lte ? { createdAt: range } : {}),
    ...(branchId ? { branch: branchId } : {}),
  };
  const patientMatch = {
    $or: ownerWhere,
    ...(range.$gte || range.$lte ? { createdAt: range } : {}),
  };
  const homeMatch = {
    $or: [{ staffId: staff._id }, { therapist: staffName }],
    ...(range.$gte || range.$lte ? { createdAt: range } : {}),
    ...(branchId ? { branch: branchId } : {}),
  };
  const txMatch = {
    staffId: staff._id,
    ...(range.$gte || range.$lte ? { paymentDate: range } : {}),
    ...(branchId ? { branchId } : {}),
  };

  const [visits, homeVisits, patients, courses, payments] = await Promise.all([
    Visit.find(visitMatch)
      .sort({ visitDate: -1, createdAt: -1 })
      .populate('patient', 'name uhid cH')
      .populate('branch', 'name'),
    HomeVisit.find(homeMatch)
      .sort({ createdAt: -1 })
      .populate('branch', 'name'),
    Patient.find(patientMatch)
      .sort({ createdAt: -1 })
      .select('name uhid cH createdAt'),
    Course.find(courseMatch)
      .sort({ createdAt: -1 })
      .populate('patient', 'name uhid cH')
      .populate('branch', 'name'),
    PaymentTransaction.find(txMatch)
      .sort({ paymentDate: -1, createdAt: -1 })
      .populate('patientId', 'name'),
  ]);

  const iso = (d) => (d ? new Date(d).toISOString().slice(0, 10) : '');
  const out = [
    ...visits.map((v) => ({
      date: iso(v.visitDate || v.createdAt),
      createdTime: v.createdAt ? new Date(v.createdAt).toISOString().slice(11, 19) : '',
      staff: staffName,
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
        staff: staffName,
        branch: h.branch?.name || 'Unassigned',
        patientName: h.patientName || '',
        uhid: '',
        type: 'Home Visit',
        cH: 'Home',
        recordNo: h.serialNo ? String(h.serialNo) : '',
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
        staff: staffName,
        branch: c.branch?.name || 'Unassigned',
        patientName: c.patient?.name || c.patientName || '',
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
      staff: staffName,
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
      staff: staffName,
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

  const summary = out.reduce(
    (acc, r) => {
      acc.billed += r.billed;
      acc.paid += r.paid;
      if (r.type === 'New OP') acc.newPatients += 1;
      else if (r.type === 'Course Registration') acc.courses += 1;
      else if (r.type === 'Follow-up') acc.followUps += 1;
      else if (r.type === 'Home Visit') acc.homeVisits += 1;
      else if (r.type === 'Payment') acc.payments += 1;
      return acc;
    },
    { billed: 0, paid: 0, newPatients: 0, courses: 0, followUps: 0, homeVisits: 0, payments: 0 }
  );
  summary.billed = round2(summary.billed);
  summary.paid = round2(summary.paid);
  summary.due = round2(Math.max(0, summary.billed - summary.paid));
  summary.entries = out.length;

  res.status(200).json(
    new ApiResponse(200, { staff: { _id: staff._id, name: staff.name, role: staff.role }, data: out, summary })
  );
});

module.exports = { listStaffs, createStaff, getStaff, updateStaff, softDeleteStaff, staffAnalyticsDetail };
