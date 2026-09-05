const express = require('express');
const protect = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const sanitize = require('../middleware/sanitize');
const { idValidator } = require('../validators/siteValidator');
const {
  generateInvoice,
} = require('../controllers/admin/opController');
const Invoice = require('../models/Invoice');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');
const mongoose = require('mongoose');
const asyncHandler = require('../utils/asyncHandler');
const OpRegistration = require('../models/OpRegistration');
const {
  searchPatients,
  createPatient,
  addVisit,
  listPatientVisits,
  listVisits,
  getVisit,
  updateVisit,
  generateVisitInvoice,
  getPatient,
  createHomeVisit,
  listHomeVisits,
  getHomeVisit,
  generateHomeVisitInvoice,
  listPaymentMethods,
  listMasterPatients,
  getMasterPatient,
} = require('../controllers/admin/visitController');
const {
  markIn,
  markOut,
  myAttendance,
} = require('../controllers/admin/attendanceController');
const {
  createCourse,
  getActiveCourse,
  getCourse,
  listCourseVisits,
  addFollowUp,
  recordPayment,
  getCourseBalance,
} = require('../controllers/admin/courseController');

const router = express.Router();

router.use(protect);
router.use(sanitize);
router.use(authorize('receptionist', 'admin', 'superAdmin'));

router.get('/patients', listMasterPatients);
router.get('/patients/:id/profile-master', getMasterPatient);
router.get('/payment-methods', listPaymentMethods);

router.post('/op-registrations', asyncHandler(async (req, res) => {
  const { branch, department, name, mobile, age, gender, address, concern, preferredDate, amount, paymentMethod } = req.body;
  if (!name || !mobile) throw new ApiError(400, 'Patient name and mobile are required');

  const total = Number(amount) || 0;
  const op = await OpRegistration.create({
    branch,
    department,
    name,
    mobile,
    age,
    gender,
    address,
    concern,
    preferredDate,
    source: 'admin',
    registeredBy: req.user._id,
    amount: amount !== undefined ? total : 0,
    subtotal: total,
    total,
    paymentMethod: paymentMethod || 'pending',
    billingStatus: total > 0 ? 'billed' : 'unbilled',
    status: 'registered',
  });

  res.status(201).json(new ApiResponse(201, { op }, 'Patient registered'));
}));

router.get('/patients/search', searchPatients);
router.post('/patients', createPatient);
router.get('/patients/:id/visits', listPatientVisits);
router.get('/patients/:id/profile', getPatient);
router.get('/patients/:id', asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid patient id');
  const op = await OpRegistration.findById(req.params.id)
    .populate('branch', 'name address city')
    .populate('department', 'name');
  if (!op) throw new ApiError(404, 'Patient not found');
  res.status(200).json(new ApiResponse(200, op));
}));
router.post('/patients/:id/visits', addVisit);

router.get('/visits', listVisits);
router.get('/visits/:id', getVisit);
router.put('/visits/:id', updateVisit);
router.post('/visits/:id/invoice', generateVisitInvoice);

router.post('/home-visits', createHomeVisit);
router.get('/home-visits', listHomeVisits);
router.get('/home-visits/:id', getHomeVisit);
router.post('/home-visits/:id/invoice', generateHomeVisitInvoice);
// Staff cannot edit or delete home visits (admin only, enforced here).

router.post('/attendance/in', markIn);
router.post('/attendance/out', markOut);
router.get('/attendance/me', myAttendance);

// Courses (package treatment billing). Staff may create courses and add follow-ups.
router.post('/courses', createCourse);
router.get('/courses/active', getActiveCourse);
router.get('/courses/:id', getCourse);
router.get('/courses/:id/visits', listCourseVisits);
router.post('/courses/:id/follow-up', addFollowUp);
router.post('/courses/:id/payments', recordPayment);
router.get('/courses/:id/balance', getCourseBalance);

router.post('/patients/:id/invoice', generateInvoice);

router.get('/invoices/:id', asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new ApiError(400, 'Invalid invoice id');
  const invoice = await Invoice.findById(req.params.id)
    .populate('branch', 'name address city phone')
    .populate('department', 'name')
    .populate('issuedBy', 'name');
  if (!invoice) throw new ApiError(404, 'Invoice not found');
  res.status(200).json(new ApiResponse(200, invoice));
}));

module.exports = router;
