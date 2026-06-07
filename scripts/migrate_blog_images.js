/**
 * migrate_blog_images.js
 * 
 * Scans all blog posts for external images from dholerahub.com,
 * uploads them to your own Cloudinary account, and updates the blog content.
 * This ensures images work in production even if the original site blocks hotlinking.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const axios = require('axios');
const { v2: cloudinary } = require('cloudinary');
const { Update, sequelize } = require('../models');

// Configure Cloudinary
if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL,
    secure: true
  });
} else {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

const EXTERNAL_DOMAIN = 'dholerahub.com';

async function uploadToCloudinary(url) {
  try {
    console.log(`  [Cloudinary] Uploading: ${url}`);
    const result = await cloudinary.uploader.upload(url, {
      folder: 'dholera/blog_images',
      resource_type: 'auto'
    });
    return result.secure_url;
  } catch (err) {
    console.error(`  [Cloudinary] Failed to upload ${url}:`, err.message);
    return null;
  }
}

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('🚀 Starting Blog Image Migration to Cloudinary...');

    const blogs = await Update.findAll();
    console.log(`Found ${blogs.length} blog records to check.`);

    let totalUpdated = 0;

    for (const blog of blogs) {
      let updated = false;
      let newImageUrl = blog.imageUrl;
      let newContent = blog.content;

      // 1. Check Featured Image
      if (blog.imageUrl && blog.imageUrl.includes(EXTERNAL_DOMAIN)) {
        const uploadedUrl = await uploadToCloudinary(blog.imageUrl);
        if (uploadedUrl) {
          newImageUrl = uploadedUrl;
          updated = true;
        }
      }

      // 2. Check Content Images ![alt](url)
      const imageRegex = /!\[(.*?)\]\((https?:\/\/dholerahub\.com\/.*?)\)/g;
      let match;
      const urlMap = new Map();

      while ((match = imageRegex.exec(blog.content)) !== null) {
        const oldUrl = match[2];
        if (!urlMap.has(oldUrl)) {
          const uploadedUrl = await uploadToCloudinary(oldUrl);
          if (uploadedUrl) {
            urlMap.set(oldUrl, uploadedUrl);
          }
        }
      }

      if (urlMap.size > 0) {
        for (const [oldUrl, uploadedUrl] of urlMap.entries()) {
          newContent = newContent.split(oldUrl).join(uploadedUrl);
        }
        updated = true;
      }

      if (updated) {
        await blog.update({
          imageUrl: newImageUrl,
          content: newContent
        });
        console.log(`✅ Updated: ${blog.title} (${blog.lang})`);
        totalUpdated++;
      }
    }

    console.log(`\n🏁 Migration Complete! ${totalUpdated} blogs updated with Cloudinary images.`);
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    await sequelize.close();
  }
}

migrate();
