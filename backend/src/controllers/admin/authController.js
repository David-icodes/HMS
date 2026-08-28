const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const User = require('../../models/User');
const ActivityLog = require('../../models/ActivityLog');
const ApiError = require('../../utils/ApiError');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

const logActivity = async ({ req, action, entity, entityId, details }) => {
  try {
    await ActivityLog.create({
      user: req.user ? req.user._id : null,
      userName: req.user ? req.user.name : 'System',
      action,
      entity,
      entityId,
      details: details || null,
    });
  } catch {
    // logging must never break the request
  }
};

const login = asyncHandler(async (req, res) => {
  const { email, username, password } = req.body;
  const identifier = (email || username || '').trim();
  if (!identifier || !password) {
    throw new ApiError(400, 'Please provide a username/email and password');
  }
  let user = null;
  if (email) {
    user = await User.findOne({ email: identifier.toLowerCase() }).select('+password');
  }
  if (!user && username) {
    user = await User.findOne({ username: identifier.toLowerCase() }).select('+password');
  }
  if (!user || !(await user.comparePassword(password))) {
    throw new ApiError(401, 'Invalid username/email or password');
  }
  if (!user.isActive) {
    throw new ApiError(403, 'Your account has been deactivated. Contact the administrator.');
  }

  user.lastLoginAt = new Date();
  await user.save({ validateBeforeSave: false });

  const token = signToken(user);
  await logActivity({ req, action: 'login', entity: 'user', entityId: user._id });

  res.status(200).json(
    new ApiResponse(200, { token, user: user.toSafeJSON() }, 'Signed in successfully')
  );
});

const me = asyncHandler(async (req, res) => {
  res.status(200).json(new ApiResponse(200, req.user.toSafeJSON()));
});

const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  const { currentPassword, newPassword } = req.body;
  if (!(await user.comparePassword(currentPassword))) {
    throw new ApiError(400, 'Current password is incorrect');
  }
  user.password = newPassword;
  await user.save();
  await logActivity({ req, action: 'change_password', entity: 'user', entityId: user._id });
  res.status(200).json(new ApiResponse(200, null, 'Password changed successfully'));
});

module.exports = { login, me, changePassword, signToken, logActivity };
