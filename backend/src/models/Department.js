const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    icon: { type: String, trim: true, default: 'Stethoscope' },
    shortDescription: { type: String, trim: true },
    description: { type: String },
    image: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

departmentSchema.pre('save', function (next) {
  if (!this.slug) this.slug = (this.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  next();
});

const Department = mongoose.model('Department', departmentSchema);
module.exports = Department;
