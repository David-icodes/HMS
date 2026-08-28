require('dotenv').config();

module.exports = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/urmila_raj_hospital',
  jwtSecret: process.env.JWT_SECRET || 'urmila-raj-hospital-secret-change-in-prod',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  uploadsDir: process.env.UPLOADS_DIR || 'public/uploads',
  publicBaseUrl: process.env.PUBLIC_BASE_URL || 'http://localhost:5000',
  superAdmin: {
    name: process.env.SUPER_ADMIN_NAME || 'Super Admin',
    email: process.env.SUPER_ADMIN_EMAIL || 'superadmin@urmilarajhospital.com',
    password: process.env.SUPER_ADMIN_PASSWORD || 'Urmila@2026',
    mobile: process.env.SUPER_ADMIN_MOBILE || '9390098723',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    folder: process.env.CLOUDINARY_FOLDER || 'urmila-raj-hospital',
  },
  rateLimits: {
    windowMs: 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 300,
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 20,
  },
};
