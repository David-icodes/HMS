const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    photo: { type: String, trim: true },
    designation: { type: String, trim: true },
    qualifications: [{ type: String, trim: true }],
    specialization: { type: String, trim: true },
    experience: { type: String, trim: true },
    about: { type: String },
    consultationTimings: { type: String, trim: true },
    available247: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    branches: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' }],
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

doctorSchema.pre('save', function (next) {
  if (!this.slug) this.slug = (this.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  next();
});

const Doctor = mongoose.model('Doctor', doctorSchema);
module.exports = Doctor;
