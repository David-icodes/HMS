const multer = require('multer');
const cloudinary = require('../../config/cloudinary');
const env = require('../../config/env');
const ApiResponse = require('../../utils/ApiResponse');
const ApiError = require('../../utils/ApiError');
const asyncHandler = require('../../utils/asyncHandler');

const ALLOWED_MIME = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME[file.mimetype]) cb(null, true);
    else cb(new ApiError(400, 'Please upload a JPG, PNG, or WebP image.'));
  },
});

const uploadStream = (client, opts, buffer) =>
  new Promise((resolve, reject) => {
    const stream = client.uploader.upload_stream(opts, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
    stream.end(buffer);
  });

const uploadImage = asyncHandler(async (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'Image size exceeds the allowed limit.' });
      }
      return res.status(err.statusCode || 400).json({ success: false, message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    if (!cloudinary.isConfigured()) {
      return res.status(503).json({
        success: false,
        message: 'Cloudinary is not configured. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in the backend .env file.',
      });
    }

    const client = cloudinary.getClient();
    const sub = String((req.body && req.body.folder) || 'misc').replace(/[^a-zA-Z0-9_-]/g, '');
    const folder = `${env.cloudinary.folder}/${sub}`.replace(/\/+/g, '/');

    try {
      const result = await uploadStream(
        client,
        {
          folder,
          public_id: `${Date.now()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')}`,
          resource_type: 'image',
          overwrite: false,
          allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
        },
        req.file.buffer
      );

      return res.status(200).json(
        new ApiResponse(
          200,
          {
            url: result.url,
            secure_url: result.secure_url,
            public_id: result.public_id,
            filename: result.public_id,
          },
          'Upload successful'
        )
      );
    } catch (uploadErr) {
      const httpCode = uploadErr.http_code || 500;
      const safe = {
        http_code: httpCode,
        name: uploadErr.name,
        message: uploadErr.message,
        code: uploadErr.code,
        status: uploadErr.status,
      };
      console.error('[Cloudinary ERROR]', JSON.stringify(safe, null, 2));

      let diagnostic =
        'Cloudinary upload rejected (HTTP ' +
        httpCode +
        '). The Cloudinary Node SDK hides the raw response body, but the account is reachable and the API credentials authenticate correctly. A 403 on upload with a working api.ping() typically indicates the Cloudinary Product Environment is blocking the upload (create) action for this API key. Grant upload permission in the Cloudinary dashboard (Product Environment -> API access), then re-test.';

      if (httpCode !== 403) {
        diagnostic = `Cloudinary upload failed: ${uploadErr.message || uploadErr}`;
      }

      return res.status(httpCode).json({
        success: false,
        message: diagnostic,
        cloudinary: safe,
      });
    }
  });
});

const extractPublicId = (value) => {
  if (!value) return null;
  if (typeof value !== 'string' || !value.includes('cloudinary')) return null;
  const match = value.match(/\/image\/upload\/(?:v\d+\/)?([^?#]+)/);
  if (match) return match[1].split('.')[0];
  const last = value.split('/').pop();
  return (last && last.split('.')[0]) || null;
};

const deleteImage = asyncHandler(async (req, res) => {
  const publicId =
    (req.params && req.params.publicId) ||
    (req.body && req.body.public_id) ||
    extractPublicId(req.body && req.body.url);

  if (!cloudinary.isConfigured()) {
    return res.status(503).json({ success: false, message: 'Cloudinary is not configured.' });
  }
  if (!publicId) {
    throw new ApiError(400, 'A Cloudinary public_id is required to delete an image.');
  }

  const client = cloudinary.getClient();
  const result = await client.uploader.destroy(publicId, { resource_type: 'image' });
  res.status(200).json(new ApiResponse(200, { result, public_id: publicId }, 'Image deleted'));
});

module.exports = { uploadImage, deleteImage, extractPublicId };
