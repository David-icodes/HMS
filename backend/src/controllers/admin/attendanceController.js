const mongoose = require('mongoose');
const Attendance = require('../../models/Attendance');
const User = require('../../models/User');
const ApiError = require('../../utils/ApiError');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { logActivity } = require('./authController');

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

const todayKey = () => new Date().toISOString().slice(0, 10);

// Staff marks IN (creates/upserts today's attendance).
const markIn = asyncHandler(async (req, res) => {
  const date = req.body.date || todayKey();
  const now = req.body.time || new Date().toTimeString().slice(0, 5);
  let att = await Attendance.findOne({ user: req.user._id, date });
  if (!att) {
    att = await Attendance.create({ user: req.user._id, date, inTime: now, branch: req.body.branch || undefined });
  } else if (!att.inTime) {
    att.inTime = now;
    att.branch = req.body.branch || att.branch;
    await att.save();
  } else {
    throw new ApiError(400, 'You have already marked IN for today');
  }
  await logActivity({ req, action: 'attendance_in', entity: 'attendance', entityId: att._id });
  res.status(200).json(new ApiResponse(200, { attendance: att }, 'IN recorded'));
});

// Staff marks OUT (updates today's attendance).
const markOut = asyncHandler(async (req, res) => {
  const date = req.body.date || todayKey();
  const now = req.body.time || new Date().toTimeString().slice(0, 5);
  const att = await Attendance.findOne({ user: req.user._id, date });
  if (!att || !att.inTime) throw new ApiError(400, 'You must mark IN before marking OUT');
  att.outTime = now;
  await att.save();
  await logActivity({ req, action: 'attendance_out', entity: 'attendance', entityId: att._id });
  res.status(200).json(new ApiResponse(200, { attendance: att }, 'OUT recorded'));
});

// Current user's today attendance status.
const myAttendance = asyncHandler(async (req, res) => {
  const date = req.query.date || todayKey();
  const att = await Attendance.findOne({ user: req.user._id, date });
  res.status(200).json(new ApiResponse(200, att || null));
});

// Admin listing with total working hours computed.
const listAttendance = asyncHandler(async (req, res) => {
  const { from, to, staff, page = 1, limit = 25 } = req.query;
  const query = {};
  const range = parseRange(from, to);
  if (range.$gte || range.$lte) query.createdAt = range;
  if (staff && mongoose.isValidObjectId(staff)) query.user = staff;

  const total = await Attendance.countDocuments(query);
  const atts = await Attendance.find(query)
    .sort({ date: -1, createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .populate('user', 'name');
  const rows = atts.map((a) => {
    const hours = workingHours(a.inTime, a.outTime);
    return { ...a.toObject(), totalHours: hours };
  });
  res.status(200).json(new ApiResponse(200, { data: rows, total, page: Number(page), limit: Number(limit), totalPages: Math.max(1, Math.ceil(total / Number(limit))) }));
});

const workingHours = (inTime, outTime) => {
  if (!inTime || !outTime) return '';
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(inTime).trim());
  const m2 = /^(\d{1,2}):(\d{2})$/.exec(String(outTime).trim());
  if (!m || !m2) return '';
  const startMin = Number(m[1]) * 60 + Number(m[2]);
  const endMin = Number(m2[1]) * 60 + Number(m2[2]);
  let diff = endMin - startMin;
  if (diff < 0) diff += 24 * 60;
  const h = Math.floor(diff / 60);
  const mm = diff % 60;
  return `${h}h ${String(mm).padStart(2, '0')}m`;
};

const listStaffForAttendance = asyncHandler(async (req, res) => {
  const users = await User.find({ isActive: true, role: { $in: ['receptionist', 'admin', 'superAdmin'] } })
    .select('name role')
    .sort({ name: 1 });
  res.status(200).json(new ApiResponse(200, users));
});

module.exports = { markIn, markOut, myAttendance, listAttendance, listStaffForAttendance };
