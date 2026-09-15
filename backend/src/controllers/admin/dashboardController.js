const Patient = require('../../models/Patient');
const Visit = require('../../models/Visit');
const Appointment = require('../../models/Appointment');
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

// C/H split: patients whose C/H is Home (free-text, case/space tolerant) are
// Home; everything else (including legacy patients without a C/H) counts as Clinic.
const HOME_CH_RE = /^\s*home\s*$/i;

// Today's Patients is the hospital-local day: [start of local day, start of the
// next local day). Never a UTC date string.
const localDayRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(start.getTime() + 86400000);
  const label = `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}-${String(start.getDate()).padStart(2, '0')}`;
  return { start, end, label };
};

const getDashboard = asyncHandler(async (req, res) => {
  const today = new Date();
  const dayKey = today.toISOString().slice(0, 10);
  const day = localDayRange();
  const todayWindow = { $gte: day.start, $lt: day.end };

  const [
    totalAppointments,
    todayAppointments,
    totalPatients,
    totalDoctors,
    totalBranches,
    totalServices,
    totalTestimonials,
    totalPosts,
    totalGallery,
    totalUsers,
    visits,
    recentAppointments,
    recentPatients,
    recentActivity,
    activePatients,
    todayVisits,
  ] = await Promise.all([
    Appointment.countDocuments(),
    Appointment.countDocuments({ createdAt: todayWindow }),
    Patient.countDocuments({ isArchived: { $ne: true } }),
    Doctor.countDocuments({ isActive: true }),
    Branch.countDocuments({ isActive: true }),
    Service.countDocuments({ isActive: true }),
    Testimonial.countDocuments({ isActive: true }),
    BlogPost.countDocuments({ isActive: true }),
    GalleryItem.countDocuments({ isActive: true }),
    User.countDocuments(),
    Setting.find({ key: { $in: ['visits.total', 'visits.today'] } }),
    Appointment.find().sort({ createdAt: -1 }).limit(8).populate('branch doctor'),
    Patient.find({ isArchived: { $ne: true } })
      .sort({ createdAt: -1, _id: -1 })
      .limit(8)
      .select('uhid name mobile cH fN createdAt'),
    ActivityLog.find().sort({ createdAt: -1 }).limit(10),
    Patient.find({ isArchived: { $ne: true } }).select('_id cH').lean(),
    Visit.find({ patient: { $ne: null }, visitDate: todayWindow }).select('patient cH').lean(),
  ]);

  // Today's Patients = today's ENCOUNTERS (the same definition as Staff →
  // Patients, Branch Reports and the OP register): every Visit whose visitDate
  // falls inside the hospital-local day, for non-archived patients. Clinic/Home
  // follows Visit.cH with the legacy fallback to the patient's own cH.
  const activePatientCH = {};
  activePatients.forEach((p) => (activePatientCH[String(p._id)] = p.cH || ''));
  const noArchived = new Set(activePatients.map((p) => String(p._id)));
  const activeTodayVisits = todayVisits.filter((v) => noArchived.has(String(v.patient)));
  let homeToday = 0;
  activeTodayVisits.forEach((v) => {
    const ch = v.cH || activePatientCH[String(v.patient)] || 'Clinic';
    if (HOME_CH_RE.test(ch)) homeToday += 1;
  });
  const todayPatients = activeTodayVisits.length;
  const clinicToday = todayPatients - homeToday;

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
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
    { $limit: 14 },
  ]);

  // Registration trend (Patient ledger), latest 14 days by local day.
  const patientTrend = await Patient.aggregate([
    { $match: { isArchived: { $ne: true } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Asia/Kolkata' } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: -1 } },
    { $limit: 14 },
    { $sort: { _id: 1 } },
  ]);

  const appointmentByStatus = await Appointment.aggregate([
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);

  res.status(200).json(
    new ApiResponse(200, {
      stats: {
        totalAppointments,
        todayAppointments,
        // Patient registration ledger (admin dashboard patient figures).
        totalPatients,
        todayPatients,
        clinicToday,
        homeToday,
        todayDate: day.label,
        totalDoctors,
        totalBranches,
        totalServices,
        totalTestimonials,
        totalPosts,
        totalGallery,
        totalUsers,
        // Aliases kept for older consumers that referenced the legacy OP name.
        totalOp: totalPatients,
        todayOp: todayPatients,
        totalVisitors: typeof visitsMap['visits.total'] === 'number' ? visitsMap['visits.total'] : 0,
        todayVisitors: isTodayVisit,
      },
      charts: {
        appointmentsTrend,
        opTrend: patientTrend,
        appointmentByStatus,
      },
      recent: {
        appointments: recentAppointments,
        opRegistrations: recentPatients,
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
