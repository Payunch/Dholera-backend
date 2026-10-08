const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { v2: cloudinary } = require('cloudinary');

let isConfigured = false;

function configureCloudinary() {
  if (isConfigured) {
    return cloudinary;
  }

  // Option A: Single DSN
  if (process.env.CLOUDINARY_URL && process.env.CLOUDINARY_URL.trim()) {
    try {
      const url = new URL(process.env.CLOUDINARY_URL);
      const cloud_name = url.hostname;
      const api_key = decodeURIComponent(url.username);
      const api_secret = decodeURIComponent(url.password);

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

  // Option B: Individual variables
  if (
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  ) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME.trim(),
      api_key: process.env.CLOUDINARY_API_KEY.trim(),
      api_secret: process.env.CLOUDINARY_API_SECRET.trim(),
      secure: true
    });
    console.log('[Cloudinary] Configured via individual env vars');
    isConfigured = true;
  }

  return cloudinary;
}

function hasCloudinaryConfig() {
  return Boolean(
    (process.env.CLOUDINARY_URL && process.env.CLOUDINARY_URL.trim()) ||
    (process.env.CLOUDINARY_CLOUD_NAME &&
     process.env.CLOUDINARY_API_KEY &&
     process.env.CLOUDINARY_API_SECRET)
  );
}

module.exports = {
  cloudinary: configureCloudinary(),
  configureCloudinary,
  hasCloudinaryConfig
};