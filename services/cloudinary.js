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

  if (hasCloudinaryDsn) {
    isConfigured = true;
    return cloudinary;
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