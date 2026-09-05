const express = require('express');
const protect = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const validate = require('../middleware/validate');
const sanitize = require('../middleware/sanitize');
const {
  login,
  me,
  changePassword,
} = require('../controllers/admin/authController');
const {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
} = require('../controllers/admin/userController');
const {
  listItems,
  getItem,
  createItem,
  updateItem,
  deleteItem,
  toggleItem,
  reorderItems,
  getMeta,
} = require('../controllers/admin/cmsController');
const { getDashboard, getActivityLogs } = require('../controllers/admin/dashboardController');
const { uploadImage, deleteImage } = require('../controllers/admin/uploadController');
const { revenueReport } = require('../controllers/admin/opController');
const {
  branchList,
  branchDetail,
  revenueReport: analyticsRevenue,
} = require('../controllers/admin/analyticsController');
const {
  listMasterPatients,
  getMasterPatient,
  exportMasterPatients,
  updateMasterPatient,
  deleteMasterPatient,
  listVisits,
  adminUpdateVisit,
  listPaymentMethods,
  createHomeVisit,
  listHomeVisits,
  getHomeVisit,
  updateHomeVisit,
  deleteHomeVisit,
  generateHomeVisitInvoice,
} = require('../controllers/admin/visitController');
const {
  dailyRegister,
  staffActivity,
  staffActivityDetail,
} = require('../controllers/admin/reportController');
const {
  markIn,
  markOut,
  myAttendance,
  listAttendance,
  listStaffForAttendance,
} = require('../controllers/admin/attendanceController');
const { createUserValidator, updateUserValidator } = require('../validators/authValidator');
const { idValidator, modelValidator } = require('../validators/siteValidator');

const router = express.Router();

router.use(protect, sanitize);

router.get('/auth/me', me);
router.post('/auth/change-password', changePassword);

router.get('/dashboard', authorize('superAdmin', 'admin', 'contentEditor', 'receptionist'), getDashboard);
router.get('/activity-logs', authorize('superAdmin', 'admin'), getActivityLogs);

router.get('/revenue', authorize('superAdmin', 'admin'), revenueReport);
router.get('/visits', authorize('superAdmin', 'admin', 'receptionist'), listVisits);
router.put('/visits/:id', authorize('superAdmin', 'admin'), adminUpdateVisit);
router.get('/payment-methods', authorize('superAdmin', 'admin'), listPaymentMethods);
router.get('/patients', authorize('superAdmin', 'admin', 'receptionist'), listMasterPatients);
router.get('/patients/export', authorize('superAdmin', 'admin'), exportMasterPatients);
router.get('/patients/:id', authorize('superAdmin', 'admin'), getMasterPatient);
router.put('/patients/:id', authorize('superAdmin', 'admin'), updateMasterPatient);
router.delete('/patients/:id', authorize('superAdmin', 'admin'), deleteMasterPatient);

// Home Visits (admin full management)
router.get('/home-visits', authorize('superAdmin', 'admin'), listHomeVisits);
router.get('/home-visits/:id', authorize('superAdmin', 'admin'), getHomeVisit);
router.post('/home-visits', authorize('superAdmin', 'admin'), createHomeVisit);
router.put('/home-visits/:id', authorize('superAdmin', 'admin'), updateHomeVisit);
router.delete('/home-visits/:id', authorize('superAdmin', 'admin'), deleteHomeVisit);
router.post('/home-visits/:id/invoice', authorize('superAdmin', 'admin'), generateHomeVisitInvoice);

// Reports (admin)
router.get('/daily-register', authorize('superAdmin', 'admin'), dailyRegister);
router.get('/staff-activity', authorize('superAdmin', 'admin'), staffActivity);
router.get('/staff-activity/detail', authorize('superAdmin', 'admin'), staffActivityDetail);

// Staff attendance (admin views)
router.get('/attendance', authorize('superAdmin', 'admin'), listAttendance);
router.get('/attendance/staff-list', authorize('superAdmin', 'admin'), listStaffForAttendance);

router.get('/analytics/branches', authorize('superAdmin', 'admin'), branchList);
router.get('/analytics/branches/:id', authorize('superAdmin', 'admin'), branchDetail);
router.get('/analytics/revenue', authorize('superAdmin', 'admin'), analyticsRevenue);

router
  .route('/users')
  .get(authorize('superAdmin', 'admin'), listUsers)
  .post(authorize('superAdmin'), validate(createUserValidator), createUser);

router
  .route('/users/:id')
  .put(authorize('superAdmin'), validate([...updateUserValidator]), updateUser)
  .delete(authorize('superAdmin'), deleteUser);

router.post('/upload', authorize('superAdmin', 'admin', 'contentEditor'), uploadImage);
router.delete('/upload/:publicId', authorize('superAdmin', 'admin', 'contentEditor'), deleteImage);

router.get('/content/meta', authorize('superAdmin', 'admin', 'contentEditor', 'receptionist'), getMeta);

router.get('/content/:model', validate(modelValidator), listItems);
router.get('/content/:model/:id', validate([...modelValidator, ...idValidator]), getItem);
router.post('/content/:model', validate(modelValidator), createItem);
router.put('/content/:model/:id', validate([...modelValidator, ...idValidator]), updateItem);
router.patch('/content/:model/:id', validate([...modelValidator, ...idValidator]), updateItem);
router.delete('/content/:model/:id', validate([...modelValidator, ...idValidator]), deleteItem);
router.patch('/content/:model/:id/toggle', validate([...modelValidator, ...idValidator]), toggleItem);
router.patch('/content/:model/reorder', validate(modelValidator), reorderItems);

module.exports = router;
