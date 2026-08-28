const xss = require('xss');

const cleanValue = (value) => {
  if (typeof value === 'string') return xss(value);
  if (Array.isArray(value)) return value.map(cleanValue);
  if (value && typeof value === 'object') {
    return Object.keys(value).reduce((acc, key) => {
      acc[key] = cleanValue(value[key]);
      return acc;
    }, {});
  }
  return value;
};

const sanitizeBody = (req, res, next) => {
  if (req.body) req.body = cleanValue(req.body);
  next();
};

module.exports = sanitizeBody;
