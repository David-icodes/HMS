const express = require('express');
const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const { getHome, getSettings, getSection, getStats } = require('../controllers/site/homeController');
const {
  listServices,
  getService,
  listDoctors,
  getDoctor,
  listDepartments,
  listBranches,
  getBranch,
  listTestimonials,
  listBlog,
  getBlog,
  listGallery,
  listGalleryBranches,
  listAboutImages,
} = require('../controllers/site/contentController');
const { bookAppointment, registerOp } = require('../controllers/site/bookingController');
const { recordVisit } = require('../controllers/site/visitController');
const validate = require('../middleware/validate');
const { appointmentValidator, opRegistrationValidator, slugValidator, pageValidator } = require('../validators/siteValidator');

const router = express.Router();

const bookingLimiter = rateLimit({ windowMs: 60 * 1000, max: 10, message: { success: false, message: 'Too many submissions. Please try again later.' } });

router.get('/home', getHome);
router.get('/settings', getSettings);
router.get('/stats', getStats);
router.get('/sections/:page', validate(pageValidator), getSection);

router.get('/services', listServices);
router.get('/services/:slug', validate(slugValidator), getService);
router.get('/departments', listDepartments);
router.get('/doctors', listDoctors);
router.get('/doctors/:slug', validate(slugValidator), getDoctor);
router.get('/branches', listBranches);
router.get('/branches/:slug', validate(slugValidator), getBranch);
router.get('/testimonials', listTestimonials);
router.get('/blog', listBlog);
router.get('/blog/:slug', validate(slugValidator), getBlog);
router.get('/gallery', listGallery);
router.get('/gallery/branches', listGalleryBranches);
router.get('/about-images', listAboutImages);

router.post('/appointments', bookingLimiter, validate(appointmentValidator), bookAppointment);
router.post('/op-registrations', bookingLimiter, validate(opRegistrationValidator), registerOp);
router.post('/visit', recordVisit);

module.exports = router;
