const jwt = require('jsonwebtoken');
const env = require('../config/env');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    throw new ApiError(401, 'Not authenticated. Please sign in.');
  }

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new ApiError(401, 'Session expired or invalid. Please sign in again.');
  }

  const user = await User.findById(payload.id).select('+passwordChangedAt');
  if (!user || !user.isActive) {
    throw new ApiError(401, 'Account not found or deactivated.');
  }

  if (user.passwordChangedAt && payload.iat) {
    const changedAt = Math.floor(user.passwordChangedAt.getTime() / 1000);
    if (payload.iat < changedAt) {
      throw new ApiError(401, 'Password was recently changed. Please sign in again.');
    }
  }

  req.user = user;
  next();
});

module.exports = protect;
