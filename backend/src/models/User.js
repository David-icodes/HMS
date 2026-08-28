const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['superAdmin', 'admin', 'receptionist', 'contentEditor'];
const ROLES_MAP = {
  PRIMARY_ADMIN: 'superAdmin',
  ADMIN: 'admin',
  STAFF: 'receptionist',
  EDITOR: 'contentEditor',
};
const PROVISIONABLE = ['admin', 'staff', 'superadmin', 'contenteditor', 'receptionist'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    username: { type: String, unique: true, sparse: true, lowercase: true, trim: true, maxlength: 50 },
    mobileNumber: { type: String, trim: true, default: '' },
    role: { type: String, enum: ROLES, default: 'receptionist' },
    password: { type: String, required: true, select: false },
    passwordChangedAt: { type: Date },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordChangedAt = new Date();
  next();
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.methods.toSafeJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

const User = mongoose.model('User', userSchema);
module.exports = User;
module.exports.ROLES = ROLES;
module.exports.ROLES_MAP = ROLES_MAP;
module.exports.PROVISIONABLE = PROVISIONABLE;
