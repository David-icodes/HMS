const env = require('./env');

let cloudinary = null;
let configured = false;

const init = () => {
  if (configured) return cloudinary;
  configured = true;

  const cloudName = env.cloudinary.cloudName;
  const apiKey = env.cloudinary.apiKey;
  const apiSecret = env.cloudinary.apiSecret;

  if (!cloudName || !apiKey || !apiSecret) {
    return null;
  }

  try {
    // eslint-disable-next-line global-require
    const client = require('cloudinary').v2;
    client.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
    cloudinary = client;
  } catch {
    cloudinary = null;
  }
  return cloudinary;
};

const isConfigured = () => init() !== null;

module.exports = { init, isConfigured, getClient: init };
