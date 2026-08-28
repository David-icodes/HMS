const mongoose = require('mongoose');

const settingSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    label: { type: String, trim: true },
    value: { type: mongoose.Schema.Types.Mixed, default: null },
    group: { type: String, trim: true, default: 'general' },
    isPublic: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const Setting = mongoose.model('Setting', settingSchema);
module.exports = Setting;
