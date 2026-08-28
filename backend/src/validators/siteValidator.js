const { body, param, query } = require('express-validator');

const MOBILE = /^[0-9]{10,15}$/;

const appointmentValidator = [
  body('branch').optional({ values: 'falsy' }).isMongoId().withMessage('Select a valid branch'),
  body('doctor').optional({ values: 'falsy' }).isMongoId().withMessage('Select a valid doctor'),
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('mobile').trim().notEmpty().withMessage('Mobile number is required').matches(MOBILE).withMessage('Enter a valid mobile number'),
  body('date').optional({ values: 'falsy' }).isString().withMessage('Select a valid date'),
  body('time').optional({ values: 'falsy' }).isString().withMessage('Select a valid time'),
  body('notes').optional({ values: 'falsy' }).isLength({ max: 500 }),
];

const opRegistrationValidator = [
  body('branch').optional({ values: 'falsy' }).isMongoId().withMessage('Select a valid branch'),
  body('department').optional({ values: 'falsy' }).isMongoId().withMessage('Select a valid department'),
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('mobile').trim().notEmpty().withMessage('Mobile number is required').matches(MOBILE).withMessage('Enter a valid mobile number'),
  body('age').optional({ values: 'falsy' }).isInt({ min: 0, max: 130 }).withMessage('Enter a valid age'),
  body('gender').optional({ values: 'falsy' }).isIn(['Male', 'Female', 'Other']).withMessage('Select a valid gender'),
  body('address').optional({ values: 'falsy' }).isLength({ max: 300 }),
  body('concern').optional({ values: 'falsy' }).isLength({ max: 500 }),
  body('preferredDate').optional({ values: 'falsy' }).isString(),
];

const slugValidator = [param('slug').isString().trim().withMessage('Invalid slug')];
const idValidator = [param('id').isMongoId().withMessage('Invalid id')];
const modelValidator = [param('model').isString().trim().withMessage('Invalid module')];
const pageValidator = [
  param('page').isString().trim().withMessage('Invalid page'),
];

module.exports = {
  appointmentValidator,
  opRegistrationValidator,
  slugValidator,
  idValidator,
  modelValidator,
  pageValidator,
};
