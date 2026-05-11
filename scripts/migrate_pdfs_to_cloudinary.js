/**
 * migrate_pdfs_to_cloudinary.js
 *
 * Run once locally to upload PDFs from uploads/pdfs/ to Cloudinary and
 * update PdfDocument.file_path to each asset's Cloudinary secure URL.
 *
 * Usage:
 *   CLOUDINARY_URL=cloudinary://api_key:api_secret@cloud_name node scripts/migrate_pdfs_to_cloudinary.js
 *
 *   OR set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env
 *   and run:
 *   node scripts/migrate_pdfs_to_cloudinary.js
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { v2: cloudinary } = require('cloudinary');
const { sequelize } = require('../models');
const PdfDocument = require('../models/PdfDocument');

const SEED_OUTPUT_PATH = path.join(__dirname, 'cloudinary_pdfs.json');
const DEFAULT_FOLDER = process.env.CLOUDINARY_PDF_FOLDER || 'dholera/pdfs';

const hasCloudinaryDsn = Boolean(process.env.CLOUDINARY_URL && process.env.CLOUDINARY_URL.trim());
const hasCloudinaryVars = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (!hasCloudinaryDsn && hasCloudinaryVars) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

const isRemoteUrl = (value = '') => /^https?:\/\//i.test(String(value).trim());

const resolveLocalFile = (storedPath) => path.resolve(__dirname, '..', storedPath);

function ensureCloudinaryConfigured() {
  if (hasCloudinaryDsn || hasCloudinaryVars) {
    return;
  }

  throw new Error(
    'Missing Cloudinary credentials. Set CLOUDINARY_URL or CLOUDINARY_CLOUD_NAME/CLOUDINARY_API_KEY/CLOUDINARY_API_SECRET.'
  );
}

async function writeSeedOutput() {
  const docs = await PdfDocument.findAll({
    order: [['id', 'ASC']]
  });

  const seedRecords = docs
    .map((pdf) => pdf.get({ plain: true }))
    .filter((pdf) => isRemoteUrl(pdf.file_path))
    .map((pdf) => ({
      title: pdf.title,
      category: pdf.category,
      file_path: pdf.file_path
    }));

  fs.writeFileSync(SEED_OUTPUT_PATH, `${JSON.stringify(seedRecords, null, 2)}\n`, 'utf8');
  console.log(`[SEED] Wrote ${seedRecords.length} Cloudinary PDF records to ${SEED_OUTPUT_PATH}`);

  if (seedRecords.length !== docs.length) {
    console.warn(
      `[SEED] Only ${seedRecords.length} of ${docs.length} records were written because some PDFs are still local or failed to upload.`
    );
  }
}

async function migrateAll() {
  ensureCloudinaryConfigured();

  await sequelize.authenticate();
  console.log('[DB] Connected.\n');

  const pdfs = await PdfDocument.findAll({ order: [['id', 'ASC']] });
  console.log(`Found ${pdfs.length} PDF records in DB.\n`);

  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const pdf of pdfs) {
    const currentPath = String(pdf.file_path || '').trim();

    if (!currentPath) {
      console.warn(`  [WARN] ${pdf.title} has no file_path value`);
      failed += 1;
      continue;
    }

    if (isRemoteUrl(currentPath)) {
      console.log(`  [SKIP] ${pdf.title} - already a URL`);
      skipped += 1;
      continue;
    }

    const localFile = resolveLocalFile(currentPath);
    if (!fs.existsSync(localFile)) {
      console.warn(`  [WARN] File not found locally: ${localFile}`);
      failed += 1;
      continue;
    }

    try {
      console.log(`  [UPLOAD] ${pdf.title} (${path.basename(localFile)}) ...`);
      const result = await cloudinary.uploader.upload(localFile, {
        resource_type: 'raw',
        folder: DEFAULT_FOLDER,
        public_id: `pdf_${pdf.id}`,
        use_filename: false,
        overwrite: true,
        invalidate: true
      });

      await pdf.update({ file_path: result.secure_url });
      console.log(`  [OK] Uploaded -> ${result.secure_url}`);
      uploaded += 1;
    } catch (err) {
      console.error(`  [FAIL] ${pdf.title}: ${err.message}`);
      failed += 1;
    }
  }

  await writeSeedOutput();
  console.log(`\n=== Migration complete: ${uploaded} uploaded, ${skipped} skipped, ${failed} failed ===`);
}

migrateAll()
  .catch((err) => {
    console.error('Fatal error:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await sequelize.close();
    } catch (err) {
      // Ignore close failures during shutdown.
    }
  });
