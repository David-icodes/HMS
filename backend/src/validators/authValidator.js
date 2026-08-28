const { body } = require('express-validator');

const loginValidator = [
  body('email').optional({ values: 'falsy' }).isEmail().withMessage('Enter a valid email'),
  body('username').optional({ values: 'falsy' }).trim().isLength({ min: 2 }).withMessage('Enter a valid username'),
  body('password').notEmpty().withMessage('Password is required'),
  body().custom((_, { req }) => {
    if (!req.body?.email && !req.body?.username) {
      throw new Error('Username or email is required');
    }
    return true;
  }),
];

const changePasswordValidator = [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Za-z]/)
    .withMessage('Password must contain a letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain a number'),
];

const ROLES = ['superAdmin', 'admin', 'receptionist', 'contentEditor'];
const MOBILE = /^[0-9]{10,15}$/;

const PIN_ROLES = ['receptionist'];

const passwordRule = (required) => {
  return body('password')
    .custom((val, { req }) => {
      const role = req.body?.role || 'receptionist';
      if (PIN_ROLES.includes(role)) {
        if (required && (val === undefined || val === null || val === '')) {
          throw new Error('PIN is required');
        }
        if (val !== undefined && val !== null && val !== '') {
          if (!/^[0-9]{4,8}$/.test(val)) {
            throw new Error('PIN must be 4 to 8 digits');
          }
        }
        return true;
      }
      if (required && (val === undefined || val === null || val === '')) {
        throw new Error('Password is required');
      }
      if (val === undefined || val === null || val === '') return true;
      if (val.length < 8) throw new Error('Password must be at least 8 characters');
      if (!/[A-Za-z]/.test(val)) throw new Error('Password must contain a letter');
      if (!/[0-9]/.test(val)) throw new Error('Password must contain a number');
      return true;
    });
};

const createUserValidator = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').trim().notEmpty().withMessage('Email is required').isEmail().withMessage('Enter a valid email'),
  body('username').optional({ values: 'falsy' }).trim().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters').matches(/^[a-zA-Z0-9_.-]+$/).withMessage('Username can contain letters, numbers, dots, dashes and underscores'),
  body('mobileNumber').optional({ values: 'falsy' }).matches(MOBILE).withMessage('Mobile must contain 10-15 digits'),
  body('role').isIn(ROLES).withMessage('Invalid role'),
  passwordRule(true),
];

const updateUserValidator = [
  body('name').optional().trim().isLength({ max: 100 }),
  body('email').optional().isEmail().withMessage('Enter a valid email'),
  body('username').optional({ values: 'falsy' }).trim().isLength({ min: 3, max: 50 }).withMessage('Username must be 3-50 characters').matches(/^[a-zA-Z0-9_.-]+$/).withMessage('Username can contain letters, numbers, dots, dashes and underscores'),
  body('mobileNumber').optional({ values: 'falsy' }).matches(MOBILE).withMessage('Mobile must contain 10-15 digits'),
  body('role').optional().isIn(ROLES).withMessage('Invalid role'),
  passwordRule(false),
];

module.exports = { loginValidator, changePasswordValidator, createUserValidator, updateUserValidator };
