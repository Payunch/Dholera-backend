const { v2: cloudinary } = require('cloudinary');

const hasCloudinaryDsn = Boolean(process.env.CLOUDINARY_URL && process.env.CLOUDINARY_URL.trim());
const hasCloudinaryVars = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

let isConfigured = false;

function configureCloudinary() {
  if (isConfigured) {
    return cloudinary;
  }

  // Parse CLOUDINARY_URL if present to ensure individual keys are set
  // DSN format: cloudinary://API_KEY:API_SECRET@CLOUD_NAME
  if (process.env.CLOUDINARY_URL) {
    try {
      const url = new URL(process.env.CLOUDINARY_URL);
      const cloud_name = url.hostname;
      const api_key = url.username;
      const api_secret = url.password;

      cloudinary.config({
        cloud_name,
        api_key,
        api_secret,
        secure: true
      });
      console.log('[Cloudinary] Configured via URL DSN');
      isConfigured = true;
      return cloudinary;
    } catch (e) {
      console.warn('[Cloudinary] Failed to parse DSN:', e.message);
    }
  }

  if (hasCloudinaryVars) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
      secure: true
    });
    isConfigured = true;
  }

  return cloudinary;
}

function hasCloudinaryConfig() {
  return hasCloudinaryDsn || hasCloudinaryVars;
}

module.exports = {
  cloudinary: configureCloudinary(),
  configureCloudinary,
  hasCloudinaryConfig
};