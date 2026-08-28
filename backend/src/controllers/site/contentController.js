const Service = require('../../models/Service');
const Doctor = require('../../models/Doctor');
const Department = require('../../models/Department');
const Branch = require('../../models/Branch');
const Testimonial = require('../../models/Testimonial');
const BlogPost = require('../../models/BlogPost');
const GalleryItem = require('../../models/GalleryItem');
const AboutImage = require('../../models/AboutImage');
const ApiResponse = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');

const listAndRespond = (Model, populate = []) =>
  asyncHandler(async (req, res) => {
    const items = await Model.find({ isActive: true }).sort({ order: 1 }).populate(populate);
    res.status(200).json(new ApiResponse(200, items));
  });

const detailAndRespond = (Model, populate = []) =>
  asyncHandler(async (req, res) => {
    const item = await Model.findOne({ slug: req.params.slug, isActive: true }).populate(populate);
    if (!item) throw new ApiError(404, 'Not found');
    res.status(200).json(new ApiResponse(200, item));
  });

const listServices = listAndRespond(Service);
const getService = detailAndRespond(Service);

const listDoctors = asyncHandler(async (req, res) => {
  const query = { isActive: true };
  if (req.query.branch) query.branches = req.query.branch;
  const items = await Doctor.find(query).sort({ order: 1 }).populate('branches', 'name slug area');
  res.status(200).json(new ApiResponse(200, items));
});

const getDoctor = detailAndRespond(Doctor, ['branches']);

const listDepartments = listAndRespond(Department);
const listBranches = listAndRespond(Branch);
const getBranch = asyncHandler(async (req, res) => {
  const branch = await Branch.findOne({ slug: req.params.slug, isActive: true });
  if (!branch) throw new ApiError(404, 'Not found');
  const doctors = await Doctor.find({ isActive: true, branches: branch._id })
    .sort({ order: 1 })
    .select('name slug specialization designation qualifications experience about photo consultationTimings available247 title order');
  res.status(200).json(new ApiResponse(200, { ...branch.toObject(), doctors }));
});
const listTestimonials = listAndRespond(Testimonial);

const listBlog = asyncHandler(async (req, res) => {
  const items = await BlogPost.find({ isActive: true })
    .sort({ publishedAt: -1 })
    .select('title slug excerpt image author publishedAt tags');
  res.status(200).json(new ApiResponse(200, items));
});

const getBlog = detailAndRespond(BlogPost);

const listGallery = asyncHandler(async (req, res) => {
  const query = { isActive: true };
  if (req.query.branch) query.branch = req.query.branch;
  if (req.query.category) query.category = req.query.category;
  const items = await GalleryItem.find(query).sort({ order: 1 }).populate('branch', 'name slug');
  res.status(200).json(new ApiResponse(200, items));
});

const listAboutImages = listAndRespond(AboutImage);

const listGalleryBranches = asyncHandler(async (req, res) => {  const branches = await Branch.find({ isActive: true }).sort({ order: 1 }).select('name slug image area');
  const counts = await GalleryItem.aggregate([
    { $match: { isActive: true, type: 'image' } },
    { $group: { _id: '$branch', count: { $sum: 1 } } },
  ]);
  const countMap = {};
  counts.forEach((c) => {
    if (c._id) countMap[c._id.toString()] = c.count;
  });
  const items = branches.map((b) => ({
    ...b.toObject(),
    imageCount: countMap[b._id.toString()] || 0,
  }));
  res.status(200).json(new ApiResponse(200, items));
});

module.exports = {
  listServices,
  getService,
  listDoctors,
  getDoctor,
  listDepartments,
  listBranches,
  getBranch,
  listTestimonials,
  listBlog,
  getBlog,
  listGallery,
  listGalleryBranches,
  listAboutImages,
};
