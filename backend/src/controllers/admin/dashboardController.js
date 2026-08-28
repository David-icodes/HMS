const Appointment = require('../../models/Appointment');
const OpRegistration = require('../../models/OpRegistration');
const Doctor = require('../../models/Doctor');
const Branch = require('../../models/Branch');
const Service = require('../../models/Service');
const Testimonial = require('../../models/Testimonial');
const BlogPost = require('../../models/BlogPost');
const GalleryItem = require('../../models/GalleryItem');
const User = require('../../models/User');
const Setting = require('../../models/Setting');
const ActivityLog = require('../../models/ActivityLog');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const getDashboard = asyncHandler(async (req, res) => {
  const today = new Date();
  const dayKey = today.toISOString().slice(0, 10);
  const startOfDay = new Date(today.setHours(0, 0, 0, 0));
  const endOfDay = new Date(today.setHours(23, 59, 59, 999));

  const [
    totalAppointments,
    todayAppointments,
    totalOp,
    todayOp,
    totalDoctors,
    totalBranches,
    totalServices,
    totalTestimonials,
    totalPosts,
    totalGallery,
    totalUsers,
    visits,
    recentAppointments,
    recentOp,
    recentActivity,
  ] = await Promise.all([
    Appointment.countDocuments(),
    Appointment.countDocuments({ createdAt: { $gte: startOfDay, $lte: endOfDay } }),
    OpRegistration.countDocuments(),
    OpRegistration.countDocuments({ createdAt: { $gte: startOfDay, $lte: endOfDay } }),
    Doctor.countDocuments({ isActive: true }),
    Branch.countDocuments({ isActive: true }),
    Service.countDocuments({ isActive: true }),
    Testimonial.countDocuments({ isActive: true }),
    BlogPost.countDocuments({ isActive: true }),
    GalleryItem.countDocuments({ isActive: true }),
    User.countDocuments(),
    Setting.find({ key: { $in: ['visits.total', 'visits.today'] } }),
    Appointment.find().sort({ createdAt: -1 }).limit(8).populate('branch doctor'),
    OpRegistration.find().sort({ createdAt: -1 }).limit(8).populate('branch department'),
    ActivityLog.find().sort({ createdAt: -1 }).limit(10),
  ]);

  const visitsMap = {};
  visits.forEach((v) => {
    visitsMap[v.key] = v.value;
  });
  const todayVisit = visitsMap['visits.today'] || {};
  const isTodayVisit =
    todayVisit && typeof todayVisit === 'object' && todayVisit.day === dayKey
      ? todayVisit.count
      : 0;

  const appointmentsTrend = await Appointment.aggregate([
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $limit: 14 },
  ]);

  const opTrend = await OpRegistration.aggregate([
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $limit: 14 },
  ]);

  const appointmentByStatus = await Appointment.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      stats: {
        totalAppointments,
        todayAppointments,
        totalOp,
        todayOp,
        totalDoctors,
        totalBranches,
        totalServices,
        totalTestimonials,
        totalPosts,
        totalGallery,
        totalUsers,
        totalVisitors: typeof visitsMap['visits.total'] === 'number' ? visitsMap['visits.total'] : 0,
        todayVisitors: isTodayVisit,
      },
      charts: {
        appointmentsTrend,
        opTrend,
        appointmentByStatus,
      },
      recent: {
        appointments: recentAppointments,
        opRegistrations: recentOp,
      },
      activity: recentActivity,
    })
  );
});

const getActivityLogs = asyncHandler(async (req, res) => {
  const { page = 1, limit = 30 } = req.query;
  const total = await ActivityLog.countDocuments();
  const items = await ActivityLog.find()
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));
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

module.exports = { getDashboard, getActivityLogs };
