/**
 * sync_from_cloudinary.js
 * 
 * Fetches all PDF resources from Cloudinary and adds them to the PdfDocument table.
 * Matches existing records by filename to avoid duplicates.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { v2: cloudinary } = require('cloudinary');
const { PdfDocument, sequelize } = require('../models');

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

function detectCategory(title) {
  const t = title.toLowerCase();
  if (t.includes('naksha') || t.includes('tp')) return 'Naksha';
  if (t.includes('dp') || t.includes('plan') || t.includes('map')) return 'DP Maps';
  if (t.includes('brochure') || t.includes('legal')) return 'Official';
  return 'General';
}

async function sync() {
  try {
    await sequelize.authenticate();
    console.log('[DB] Connected.');

    // Fix sequence if on Postgres
    if (sequelize.getDialect() === 'postgres') {
      await sequelize.query(`
        SELECT setval(pg_get_serial_sequence('"PdfDocuments"', 'id'), 
        COALESCE((SELECT MAX(id) FROM "PdfDocuments"), 1));
      `);
    }

    console.log('[Cloudinary] Fetching all PDF resources...');
    
    const rawResult = await cloudinary.api.resources({ resource_type: 'raw', max_results: 500 });
    const imgResult = await cloudinary.api.resources({ resource_type: 'image', max_results: 500 });

    const allResources = [...rawResult.resources, ...imgResult.resources];
    const resources = allResources.filter(r => r.format === 'pdf' || r.secure_url.endsWith('.pdf'));
    console.log(`[Cloudinary] Found ${resources.length} PDF resources.`);

    let added = 0;
    let updated = 0;
    let total = 0;

    for (const res of resources) {
      const url = res.secure_url;
      const publicId = res.public_id;
      const fileName = path.basename(publicId);
      const title = fileName.replace(/_/g, ' ').replace(/\.pdf$/i, '');
      const category = detectCategory(title);
      
      // Match by filename in the URL
      const { Op } = require('sequelize');
      const doc = await PdfDocument.findOne({ 
        where: { 
          file_path: { [Op.like]: `%${fileName}%` } 
        } 
      });
      
      if (!doc) {
        await PdfDocument.create({
          title: title,
          category: category,
          file_path: url,
          storage_type: res.type,
          resource_type: res.resource_type,
          is_protected: true,
          documentDate: res.created_at
        });
        console.log(`  [ADDED] ${title} (${category}) [${res.type}]`);
        added++;
      } else {
        await doc.update({
          file_path: url,
          storage_type: res.type,
          resource_type: res.resource_type,
          documentDate: res.created_at
        });
        updated++;
      }
      total++;
    }

    console.log(`\nSync Complete: ${added} added, ${updated} updated, ${total} total.`);
    
  } catch (err) {
    console.error('Sync failed:', err);
  } finally {
    await sequelize.close();
  }
}

sync();
