const mongoose = require('mongoose');

const galleryItemSchema = new mongoose.Schema(
  {
    title: { type: String, trim: true },
    category: { type: String, trim: true, default: 'Hospital' },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch' },
    type: { type: String, enum: ['image', 'video'], default: 'image' },
    image: { type: String, trim: true },
    videoUrl: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const GalleryItem = mongoose.model('GalleryItem', galleryItemSchema);
module.exports = GalleryItem;
