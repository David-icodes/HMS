const express = require('express');
const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const { login, me, changePassword } = require('../controllers/admin/authController');
const protect = require('../middleware/auth');
const validate = require('../middleware/validate');
const { loginValidator, changePasswordValidator } = require('../validators/authValidator');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: env.rateLimits.authMax,
  message: { success: false, message: 'Too many sign-in attempts. Please try again later.' },
});

router.post('/login', loginLimiter, validate(loginValidator), login);
router.get('/me', protect, me);
router.post('/change-password', protect, validate(changePasswordValidator), changePassword);

module.exports = router;
