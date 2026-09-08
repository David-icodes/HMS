const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    role: { type: String, trim: true, default: 'Receptionist' },
    mobile: { type: String, trim: true, default: '' },
    email: { type: String, trim: true, lowercase: true, default: '' },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', default: null },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

staffSchema.index({ name: 1 });
staffSchema.index({ isActive: 1 });

module.exports = mongoose.model('Staff', staffSchema);