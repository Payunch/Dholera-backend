/**
 * sync_from_cloudinary.js
 * 
 * Fetches all PDF resources from Cloudinary and adds them to the PdfDocument table
 * if they don't already exist.
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

    console.log('[Cloudinary] Fetching all PDF resources...');
    
    // Check both 'raw' and 'image' as sometimes PDFs get uploaded as images
    const rawResult = await cloudinary.api.resources({
      resource_type: 'raw',
      max_results: 500
    });
    const imgResult = await cloudinary.api.resources({
      resource_type: 'image',
      max_results: 500
    });

    const allResources = [...rawResult.resources, ...imgResult.resources];
    const resources = allResources.filter(r => r.format === 'pdf' || r.secure_url.endsWith('.pdf'));
    console.log(`[Cloudinary] Found ${resources.length} PDF resources across raw/image types.`);

    let added = 0;
    let existing = 0;

    for (const res of resources) {
      const url = res.secure_url;
      const publicId = res.public_id;
      
      // Try to find by URL
      const found = await PdfDocument.findOne({ where: { file_path: url } });
      
      if (!found) {
        // Create a title from public_id
        const title = path.basename(publicId).replace(/_/g, ' ').replace(/\.pdf$/i, '');
        const category = detectCategory(title);
        
        await PdfDocument.create({
          title: title,
          category: category,
          file_path: url,
          is_protected: true,
          documentDate: res.created_at
        });
        console.log(`  [ADDED] ${title} (${category})`);
        added++;
      } else {
        existing++;
      }
    }

    console.log(`\nSync Complete: ${added} added, ${existing} already in database.`);
    
    // Update the seed file too
    const allDocs = await PdfDocument.findAll({ raw: true });
    const seedData = allDocs.map(d => ({
      title: d.title,
      category: d.category,
      file_path: d.file_path,
      documentDate: d.documentDate
    }));
    
    const seedPath = path.join(__dirname, 'cloudinary_pdfs.json');
    const fs = require('fs');
    fs.writeFileSync(seedPath, JSON.stringify(seedData, null, 2), 'utf8');
    console.log(`[Seed] Updated ${seedPath} with ${allDocs.length} records.`);

  } catch (err) {
    console.error('Sync failed:', err);
  } finally {
    await sequelize.close();
  }
}

sync();
