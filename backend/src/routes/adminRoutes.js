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
const { listPatients, exportPatients, revenueReport } = require('../controllers/admin/opController');
const {
  branchList,
  branchDetail,
  revenueReport: analyticsRevenue,
} = require('../controllers/admin/analyticsController');
const { createUserValidator, updateUserValidator } = require('../validators/authValidator');
const { idValidator, modelValidator } = require('../validators/siteValidator');

const router = express.Router();

router.use(protect, sanitize);

router.get('/auth/me', me);
router.post('/auth/change-password', changePassword);

router.get('/dashboard', authorize('superAdmin', 'admin', 'contentEditor', 'receptionist'), getDashboard);
router.get('/activity-logs', authorize('superAdmin', 'admin'), getActivityLogs);

router.get('/revenue', authorize('superAdmin', 'admin'), revenueReport);
router.get('/patients', authorize('superAdmin', 'admin', 'receptionist'), listPatients);
router.get('/patients/export', authorize('superAdmin', 'admin', 'receptionist'), exportPatients);

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
