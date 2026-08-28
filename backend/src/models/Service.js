const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    icon: { type: String, trim: true, default: 'HeartPulse' },
    shortDescription: { type: String, trim: true },
    description: { type: String },
    image: { type: String, trim: true },
    featured: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

serviceSchema.pre('save', function (next) {
  if (!this.slug) this.slug = (this.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  next();
});

const Service = mongoose.model('Service', serviceSchema);
module.exports = Service;
