const mongoose = require('mongoose');

const aboutImageSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    caption: { type: String, trim: true },
    image: { type: String, trim: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const AboutImage = mongoose.model('AboutImage', aboutImageSchema);
module.exports = AboutImage;
