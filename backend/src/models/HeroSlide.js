const mongoose = require('mongoose');

const heroSlideSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    subtitle: { type: String, trim: true },
    description: { type: String },
    image: { type: String, trim: true },
    ctaLabel: { type: String, trim: true, default: 'Book Appointment' },
    ctaHref: { type: String, trim: true, default: '/book-appointment' },
    secondaryLabel: { type: String, trim: true },
    secondaryHref: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const HeroSlide = mongoose.model('HeroSlide', heroSlideSchema);
module.exports = HeroSlide;
