const User = require('../../models/User');
const ApiError = require('../../utils/ApiError');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { logActivity } = require('./authController');

const listUsers = asyncHandler(async (req, res) => {
  const { search, role, page = 1, limit = 20 } = req.query;
  const query = {};
  if (role) query.role = role;
  if (search) {
    const term = search.trim();
    const digits = term.replace(/\D/g, '');
    query.$or = [{ name: new RegExp(term, 'i') }, { email: new RegExp(term, 'i') }, { username: new RegExp(term, 'i') }];
    if (digits) query.$or.push({ mobileNumber: new RegExp(digits) });
  }
  const total = await User.countDocuments(query);
  const users = await User.find(query)
    .sort({ createdAt: -1 })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit));
  res.status(200).json(
    new ApiResponse(200, {
      data: users.map((u) => u.toSafeJSON()),
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.max(1, Math.ceil(total / Number(limit))),
    })
  );
});

const isPrimaryAdmin = (user) => user && user.username === 'admin';

const createUser = asyncHandler(async (req, res) => {
  if (req.body.username && req.body.username.toLowerCase() === 'admin') {
    throw new ApiError(400, 'The username "admin" is reserved for the primary administrator');
  }
  const exists = await User.findOne({
    $or: [{ email: req.body.email.toLowerCase() }, ...(req.body.mobileNumber ? [{ mobileNumber: req.body.mobileNumber }] : [])],
  });
  if (exists) throw new ApiError(409, 'A user with this email or mobile already exists');

  const user = await User.create({ ...req.body, createdBy: req.user._id });
  await logActivity({ req, action: 'create', entity: 'user', entityId: user._id, details: { name: user.name, role: user.role } });
  res.status(201).json(new ApiResponse(201, { user: user.toSafeJSON() }, 'User created successfully'));
});

const updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id).select('+password');
  if (!user) throw new ApiError(404, 'User not found');

  if (req.body.username && req.body.username.toLowerCase() === 'admin' && req.user.username !== 'admin') {
    throw new ApiError(400, 'The username "admin" is reserved for the primary administrator');
  }

  if (req.body.email || req.body.mobileNumber || req.body.username) {
    const dup = await User.findOne({
      _id: { $ne: user._id },
      $or: [
        ...(req.body.email ? [{ email: req.body.email.toLowerCase() }] : []),
        ...(req.body.mobileNumber ? [{ mobileNumber: req.body.mobileNumber }] : []),
        ...(req.body.username ? [{ username: req.body.username.toLowerCase() }] : []),
      ],
    });
    if (dup) throw new ApiError(409, 'A user with this email, mobile or username already exists');
  }

  const allowed = ['name', 'email', 'username', 'mobileNumber', 'role', 'isActive'];
  if (req.body.password !== undefined && req.body.password !== null && req.body.password !== '') {
    user.password = req.body.password;
  }
  allowed.forEach((f) => {
    if (req.body[f] !== undefined) user[f] = req.body[f];
  });
  await user.save();
  await logActivity({ req, action: 'update', entity: 'user', entityId: user._id, details: { name: user.name } });
  res.status(200).json(new ApiResponse(200, { user: user.toSafeJSON() }, 'User updated successfully'));
});

const deleteUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  if (user._id.equals(req.user._id)) throw new ApiError(400, 'You cannot delete your own account');
  if (user.role === 'superAdmin') throw new ApiError(400, 'A super admin account cannot be deleted');
  if (isPrimaryAdmin(user)) throw new ApiError(400, 'The primary admin account cannot be deleted');

  await User.findByIdAndDelete(user._id);
  await logActivity({ req, action: 'delete', entity: 'user', entityId: user._id, details: { name: user.name } });
  res.status(200).json(new ApiResponse(200, null, 'User deleted successfully'));
});

module.exports = { listUsers, createUser, updateUser, deleteUser };
