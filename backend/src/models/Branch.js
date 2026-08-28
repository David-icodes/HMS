const mongoose = require('mongoose');

const branchSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, unique: true, lowercase: true, trim: true },
    code: { type: String, trim: true },
    address: { type: String, trim: true },
    area: { type: String, trim: true },
    city: { type: String, trim: true, default: 'Hyderabad' },
    phone: { type: String, trim: true },
    whatsapp: { type: String, trim: true },
    email: { type: String, trim: true },
    workingHours: { type: String, trim: true, default: 'Mon - Sat: 9:00 AM - 9:00 PM' },
    emergencyPhone: { type: String, trim: true },
    googleMapsEmbed: { type: String, trim: true },
    googleMapsLink: { type: String, trim: true },
    image: { type: String, trim: true },
    description: { type: String },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

branchSchema.pre('save', function (next) {
  if (!this.slug) this.slug = (this.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  next();
});

const Branch = mongoose.model('Branch', branchSchema);
module.exports = Branch;
