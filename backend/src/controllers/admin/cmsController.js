const mongoose = require('mongoose');
const HeroSlide = require('../../models/HeroSlide');
const Doctor = require('../../models/Doctor');
const Service = require('../../models/Service');
const Department = require('../../models/Department');
const Branch = require('../../models/Branch');
const GalleryItem = require('../../models/GalleryItem');
const Testimonial = require('../../models/Testimonial');
const BlogPost = require('../../models/BlogPost');
const PageSection = require('../../models/PageSection');
const Setting = require('../../models/Setting');
const Appointment = require('../../models/Appointment');
const OpRegistration = require('../../models/OpRegistration');
const Invoice = require('../../models/Invoice');
const AboutImage = require('../../models/AboutImage');
const cloudinary = require('../../config/cloudinary');
const { extractPublicId } = require('./uploadController');
const ApiError = require('../../utils/ApiError');
const ApiResponse = require('../../utils/ApiResponse');
const asyncHandler = require('../../utils/asyncHandler');
const { logActivity } = require('./authController');

const MODEL_REGISTRY = {
  heroes: {
    model: HeroSlide,
    category: 'content',
    searchFields: ['title', 'subtitle'],
  },
  doctors: {
    model: Doctor,
    category: 'content',
    searchFields: ['name', 'specialization', 'designation'],
    populate: [{ path: 'branches', select: 'name slug' }],
  },
  services: { model: Service, category: 'content', searchFields: ['name'] },
  departments: { model: Department, category: 'content', searchFields: ['name'] },
  branches: { model: Branch, category: 'content', searchFields: ['name', 'area', 'city'] },
  gallery: {
    model: GalleryItem,
    category: 'content',
    searchFields: ['title', 'category'],
    populate: [{ path: 'branch', select: 'name' }],
  },
  testimonials: {
    model: Testimonial,
    category: 'content',
    searchFields: ['patientName', 'treatment'],
  },
  blog: { model: BlogPost, category: 'content', searchFields: ['title', 'tags'] },
  sections: { model: PageSection, category: 'content', searchFields: ['key', 'page'] },
  settings: { model: Setting, category: 'settings', searchFields: ['key', 'label'] },
  appointments: {
    model: Appointment,
    category: 'appointments',
    searchFields: ['name', 'mobile'],
    populate: [
      { path: 'branch', select: 'name' },
      { path: 'doctor', select: 'name' },
    ],
  },
  'op-registrations': {
    model: OpRegistration,
    category: 'op',
    searchFields: ['name', 'mobile', 'opdNumber', 'concern'],
    populate: [
      { path: 'branch', select: 'name' },
      { path: 'department', select: 'name' },
    ],
  },
  'about-images': {
    model: AboutImage,
    category: 'content',
    searchFields: ['title', 'caption'],
  },
  invoices: {
    model: Invoice,
    category: 'op',
    searchFields: ['invoiceNumber', 'patientName', 'patientMobile', 'opdNumber'],
    populate: [
      { path: 'patient', select: 'name mobile opdNumber' },
      { path: 'branch', select: 'name' },
      { path: 'department', select: 'name' },
      { path: 'issuedBy', select: 'name' },
    ],
  },
};

const ROLE_PERMISSIONS = {
  superAdmin: ['content', 'appointments', 'op', 'settings'],
  admin: ['content', 'appointments', 'op', 'settings'],
  contentEditor: ['content'],
  receptionist: ['appointments', 'op'],
};

const INTERNAL_PATHS = new Set(['_id', '__v', 'createdAt', 'updatedAt', 'createdBy', 'passwordChangedAt', 'lastLoginAt']);

const assertPermission = (user, category) => {
  const allowed = ROLE_PERMISSIONS[user.role] || [];
  if (!allowed.includes(category)) {
    throw new ApiError(403, 'You do not have permission to manage this module.');
  }
};

const resolveModel = (key) => {
  const config = MODEL_REGISTRY[key];
  if (!config) throw new ApiError(404, 'Unknown content module');
  return config;
};

const pickSchemaFields = (body, schema) => {
  const allowed = Object.keys(schema.paths).filter((p) => !INTERNAL_PATHS.has(p));
  const picked = {};
  allowed.forEach((field) => {
    if (body[field] !== undefined) picked[field] = body[field];
  });
  return picked;
};

const buildSearchQuery = (config, term) => {
  const digits = term.replace(/\D/g, '');
  const or = config.searchFields.map((f) => ({ [f]: new RegExp(term, 'i') }));
  if (digits && config.searchFields.some((f) => /mobile|phone/i.test(f))) {
    config.searchFields.forEach((f) => {
      if (/mobile|phone/i.test(f)) or.push({ [f]: new RegExp(digits) });
    });
  }
  return { $or: or };
};

const listItems = asyncHandler(async (req, res) => {
  const config = resolveModel(req.params.model);
  assertPermission(req.user, config.category);
  const Model = config.model;

  const query = {};
  const { search, page = 1, limit = 20, sort, status, branch, role } = req.query;

  if (search) Object.assign(query, buildSearchQuery(config, search.trim()));
  if (status === 'active') query.isActive = true;
  if (status === 'inactive') query.isActive = false;
  if (branch) query.branch = branch;
  if (role) query.role = role;

  if (config.model === Setting) {
    Object.assign(query, {});
  }

  const sortBy = sort || (config.model.schema.paths.order ? 'order' : '-createdAt');
  const sortDir = sortBy.startsWith('-') ? -1 : 1;
  const sortKey = sortBy.replace(/^-/, '');

  const total = await Model.countDocuments(query);
  const items = await Model.find(query)
    .sort({ [sortKey]: sortDir })
    .skip((Number(page) - 1) * Number(limit))
    .limit(Number(limit))
    .populate(config.populate || []);

  res.status(200).json(
    new ApiResponse(200, {
      data: items,
      total,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.max(1, Math.ceil(total / Number(limit))),
    })
  );
});

const getItem = asyncHandler(async (req, res) => {
  const config = resolveModel(req.params.model);
  assertPermission(req.user, config.category);
  const item = await config.model.findById(req.params.id).populate(config.populate || []);
  if (!item) throw new ApiError(404, 'Record not found');
  res.status(200).json(new ApiResponse(200, item));
});

const createItem = asyncHandler(async (req, res) => {
  const config = resolveModel(req.params.model);
  assertPermission(req.user, config.category);
  const picked = pickSchemaFields(req.body, config.model.schema);
  if (req.params.model === 'op-registrations') {
    picked.registeredBy = req.user._id;
  }
  if (req.params.model === 'invoices') {
    picked.issuedBy = req.user._id;
  }
  const item = await config.model.create(picked);
  await logActivity({
    req,
    action: 'create',
    entity: req.params.model,
    entityId: item._id,
    details: { title: item.name || item.title || item.key },
  });
  res.status(201).json(new ApiResponse(201, { item }, 'Created successfully'));
});

const updateItem = asyncHandler(async (req, res) => {
  const config = resolveModel(req.params.model);
  assertPermission(req.user, config.category);
  const item = await config.model.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Record not found');

  if (config.category === 'appointments' || config.category === 'op') {
    const allowed = ['status', 'notes', 'preferredDate', 'date', 'time', 'branch', 'doctor', 'paymentMethod', 'amount', 'subtotal', 'discount', 'tax', 'total', 'billingStatus', 'age', 'gender', 'address', 'concern', 'mobile', 'name'];
    allowed.forEach((f) => {
      if (req.body[f] !== undefined) item[f] = req.body[f];
    });
  } else {
    const picked = pickSchemaFields(req.body, config.model.schema);
    Object.assign(item, picked);
  }

  await item.save();
  await logActivity({
    req,
    action: 'update',
    entity: req.params.model,
    entityId: item._id,
    details: { title: item.name || item.title || item.key },
  });
  res.status(200).json(new ApiResponse(200, { item }, 'Updated successfully'));
});

const IMAGE_FIELD_NAMES = [
  'image', 'photo', 'coverImage', 'logo', 'icon', 'avatar', 'banner', 'background',
  'thumbnail', 'images', 'gallery', 'igUrl',
];

const collectRefIds = (value) => {
  const ids = new Set();
  const visit = (v) => {
    if (!v) return;
    if (Array.isArray(v)) {
      v.forEach(visit);
      return;
    }
    if (typeof v === 'object') {
      Object.values(v).forEach(visit);
      return;
    }
    const pid = typeof v === 'string' ? extractPublicId(v) : null;
    if (pid) ids.add(pid);
  };
  visit(value);
  return [...ids];
};

const cleanupCloudinaryImages = async (config, item) => {
  if (!cloudinary.isConfigured()) return;

  const publicIds = new Set();

  // gather public ids from image-like fields
  const data = item.toObject ? item.toObject() : item.toObject();
  Object.entries(data).forEach(([key, value]) => {
    if (IMAGE_FIELD_NAMES.includes(key)) collectRefIds(value).forEach((id) => publicIds.add(id));
  });

  if (publicIds.size === 0) return;

  // check every CMS module for other references before deleting (safe deletion)
  const models = Object.values(MODEL_REGISTRY).map((c) => c.model);
  const uniqueModels = models.filter((m, i) => models.indexOf(m) === i);

  const client = cloudinary.getClient();
  for (const pid of publicIds) {
    try {
      const quoted = pid.replace(/"/g, '\\"');
      let referencedElsewhere = false;
      for (const Model of uniqueModels) {
        if (Model === config.model) continue;
        const found = await Model.findOne({
          $or: [
            { image: { $regex: quoted, $options: 'i' } },
            { photo: { $regex: quoted, $options: 'i' } },
            { coverImage: { $regex: quoted, $options: 'i' } },
            { images: pid },
          ],
        }).select('_id').lean();
        if (found) {
          referencedElsewhere = true;
          break;
        }
      }
      if (!referencedElsewhere) {
        await client.uploader.destroy(pid, { resource_type: 'image' });
      }
    } catch {
      // never break the delete on image cleanup failure
    }
  }
};

const deleteItem = asyncHandler(async (req, res) => {
  const config = resolveModel(req.params.model);
  assertPermission(req.user, config.category);
  const item = await config.model.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Record not found');
  await cleanupCloudinaryImages(config, item);
  await config.model.findByIdAndDelete(item._id);
  await logActivity({
    req,
    action: 'delete',
    entity: req.params.model,
    entityId: item._id,
    details: { title: item.name || item.title || item.key },
  });
  res.status(200).json(new ApiResponse(200, null, 'Deleted successfully'));
});

const toggleItem = asyncHandler(async (req, res) => {
  const config = resolveModel(req.params.model);
  assertPermission(req.user, config.category);
  const item = await config.model.findById(req.params.id);
  if (!item) throw new ApiError(404, 'Record not found');
  if (!config.model.schema.paths.isActive) {
    throw new ApiError(400, 'This module does not support enable/disable');
  }
  item.isActive = req.body.isActive !== undefined ? req.body.isActive : !item.isActive;
  await item.save();
  res.status(200).json(new ApiResponse(200, { item }, 'Status updated'));
});

const reorderItems = asyncHandler(async (req, res) => {
  const config = resolveModel(req.params.model);
  assertPermission(req.user, config.category);
  const { ids } = req.body;
  if (!Array.isArray(ids) || !ids.every(mongoose.isValidObjectId)) {
    throw new ApiError(400, 'A valid ordered list of ids is required');
  }
  await Promise.all(
    ids.map((id, index) =>
      config.model.updateOne({ _id: id }, { $set: { order: index + 1 } })
    )
  );
  await logActivity({ req, action: 'reorder', entity: req.params.model });
  res.status(200).json(new ApiResponse(200, null, 'Order saved'));
});

const getMeta = asyncHandler(async (req, res) => {
  const keys = Object.keys(MODEL_REGISTRY);
  const meta = keys.map((key) => {
    const config = MODEL_REGISTRY[key];
    return { key, category: config.category, label: key.replace(/-/g, ' ') };
  });
  res.status(200).json(new ApiResponse(200, meta));
});

module.exports = { listItems, getItem, createItem, updateItem, deleteItem, toggleItem, reorderItems, getMeta };
