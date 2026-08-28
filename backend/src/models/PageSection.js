const mongoose = require('mongoose');

const pageSectionSchema = new mongoose.Schema(
  {
    page: { type: String, required: true, trim: true, default: 'home' },
    key: { type: String, required: true, trim: true },
    content: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

pageSectionSchema.index({ page: 1, key: 1 }, { unique: true });

const PageSection = mongoose.model('PageSection', pageSectionSchema);
module.exports = PageSection;
