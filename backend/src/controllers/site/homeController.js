const HeroSlide = require('../../models/HeroSlide');
const Service = require('../../models/Service');
const Doctor = require('../../models/Doctor');
const Branch = require('../../models/Branch');
const Testimonial = require('../../models/Testimonial');
const BlogPost = require('../../models/BlogPost');
const GalleryItem = require('../../models/GalleryItem');
const Setting = require('../../models/Setting');
const PageSection = require('../../models/PageSection');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');

const settingMap = async (keys) => {
  const rows = await Setting.find({ key: { $in: keys } });
  return rows.reduce((acc, r) => {
    acc[r.key] = r.value;
    return acc;
  }, {});
};

const getHome = asyncHandler(async (req, res) => {
  const [slides, services, doctors, branches, testimonials, gallery, posts, settings] =
    await Promise.all([
      HeroSlide.find({ isActive: true }).sort({ order: 1 }),
      Service.find({ isActive: true }).sort({ order: 1 }).limit(8),
      Doctor.find({ isActive: true }).sort({ order: 1 }).limit(6).populate('branches', 'name slug'),
      Branch.find({ isActive: true }).sort({ order: 1 }),
      Testimonial.find({ isActive: true }).sort({ order: 1 }).limit(6),
      GalleryItem.find({ isActive: true }).sort({ order: 1 }).limit(8).populate('branch', 'name'),
      BlogPost.find({ isActive: true }).sort({ publishedAt: -1 }).limit(3),
      settingMap([
        'contact.phones',
        'contact.whatsapp',
        'contact.email',
        'contact.address',
        'emergency.phone',
        'social',
        'stats',
        'home.intro',
        'home.whyChooseUs',
        'home.cta',
        'seo',
      ]),
    ]);

  const sections = await PageSection.find({ page: 'home' });

  res.status(200).json(
    new ApiResponse(200, {
      hero: { slides },
      services,
      doctors,
      branches,
      testimonials,
      gallery,
      posts,
      settings,
      sections,
    })
  );
});

const getSettings = asyncHandler(async (req, res) => {
  const settings = await Setting.find({ isPublic: true });
  res.status(200).json(new ApiResponse(200, settings));
});

const getSection = asyncHandler(async (req, res) => {
  const sections = await PageSection.find({ page: req.params.page || 'home' });
  res.status(200).json(new ApiResponse(200, sections));
});

const getStats = asyncHandler(async (req, res) => {
  const stats = await settingMap(['stats', 'contact.phones', 'emergency.phone']);
  res.status(200).json(new ApiResponse(200, stats));
});

module.exports = { getHome, getSettings, getSection, getStats };
