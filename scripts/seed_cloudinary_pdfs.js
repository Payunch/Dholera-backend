/**
 * seed_cloudinary_pdfs.js
 *
 * Seeds PdfDocument records using Cloudinary URLs.
 * This runs automatically on backend startup (via index.js) if the
 * PdfDocument table is empty.
 *
 * Preferred flow:
 * - Run `scripts/migrate_pdfs_to_cloudinary.js` locally once.
 * - Commit the generated `scripts/cloudinary_pdfs.json` file.
 * - On a fresh deploy, this seed script will load those URLs automatically.
 *
 * Fallback flow:
 * - If the JSON file is not present yet, replace the placeholder URLs below.
 */

const fs = require('fs');
const path = require('path');

const GENERATED_DATA_PATH = path.join(__dirname, 'cloudinary_pdfs.json');
const PLACEHOLDER_VALUE = 'REPLACE_WITH_CLOUDINARY_URL';

const PLACEHOLDER_PDFS = [
  { title: 'New DP Plan 2026', category: 'DP Maps', file_path: PLACEHOLDER_VALUE },
  { title: 'Dholera DP Map - Zone Hath', category: 'DP Maps', file_path: PLACEHOLDER_VALUE },
  { title: 'New Development Plan Layout', category: 'DP Maps', file_path: PLACEHOLDER_VALUE },
  { title: 'TP 1A1 Final Naksha', category: 'Naksha', file_path: PLACEHOLDER_VALUE },
  { title: 'TP 1A2 Final Naksha', category: 'Naksha', file_path: PLACEHOLDER_VALUE },
  { title: 'TP 2B1 Naksha', category: 'Naksha', file_path: PLACEHOLDER_VALUE },
  { title: 'TP 2B-1 Layout', category: 'Naksha', file_path: PLACEHOLDER_VALUE },
  { title: 'TP 2B-2 Layout', category: 'Naksha', file_path: PLACEHOLDER_VALUE },
  { title: 'TP 2B3 Layout', category: 'Naksha', file_path: PLACEHOLDER_VALUE },
  { title: 'TP 3B 2021', category: 'Naksha', file_path: PLACEHOLDER_VALUE },
  { title: 'TP 4B1 2024', category: 'Naksha', file_path: PLACEHOLDER_VALUE },
  { title: 'TP 4B-1 After TR', category: 'Naksha', file_path: PLACEHOLDER_VALUE },
  { title: 'TP 4B-2 Layout', category: 'Naksha', file_path: PLACEHOLDER_VALUE },
  { title: 'TP 5 O.P. F.P.', category: 'Naksha', file_path: PLACEHOLDER_VALUE },
  { title: 'TP 5A 2021', category: 'Naksha', file_path: PLACEHOLDER_VALUE },
  { title: 'TP 5A After TR', category: 'Naksha', file_path: PLACEHOLDER_VALUE },
  { title: 'TP 5B 2021', category: 'Naksha', file_path: PLACEHOLDER_VALUE },
  { title: 'TP 6A 2021', category: 'Naksha', file_path: PLACEHOLDER_VALUE },
  { title: 'TP 3A Authority Paramarsh', category: 'PDFs', file_path: PLACEHOLDER_VALUE },
  { title: 'TP 3C-1 CTP TR Paramarsh', category: 'PDFs', file_path: PLACEHOLDER_VALUE },
  { title: 'Infrastructure Update April 2026', category: 'PDFs', file_path: PLACEHOLDER_VALUE }
];

function loadGeneratedSeedData() {
  if (!fs.existsSync(GENERATED_DATA_PATH)) {
    return PLACEHOLDER_PDFS;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(GENERATED_DATA_PATH, 'utf8'));
    if (!Array.isArray(parsed)) {
      console.warn('[Seed] Generated Cloudinary PDF data is not an array. Falling back to placeholders.');
      return PLACEHOLDER_PDFS;
    }

    const normalized = parsed
      .filter((item) => item && typeof item === 'object')
      .map((item) => ({
        title: String(item.title || '').trim(),
        category: String(item.category || '').trim(),
        file_path: String(item.file_path || '').trim(),
        documentDate: item.documentDate || null
      }))
      .filter((item) => item.title && item.file_path);

    if (normalized.length === 0) {
      console.warn('[Seed] Generated Cloudinary PDF data is empty. Falling back to placeholders.');
      return PLACEHOLDER_PDFS;
    }

    return normalized;
  } catch (err) {
    console.warn(`[Seed] Failed to read ${GENERATED_DATA_PATH}: ${err.message}`);
    return PLACEHOLDER_PDFS;
  }
}

async function seedPdfsIfEmpty(PdfDocument) {
  try {
    const existingPdfs = await PdfDocument.findAll();
    const pdfsToSeed = loadGeneratedSeedData();
    const hasPlaceholders = pdfsToSeed.some((pdf) => pdf.file_path === PLACEHOLDER_VALUE);

    if (hasPlaceholders) {
      console.warn('[Seed] Cloudinary seed URLs are not ready yet.');
      return;
    }

    if (existingPdfs.length === 0) {
      await PdfDocument.bulkCreate(pdfsToSeed);
      console.log(`[Seed] Seeded ${pdfsToSeed.length} PDF records from Cloudinary URLs with actual dates.`);
    } else {
      console.log(`[Seed] PdfDocument table has ${existingPdfs.length} records. Checking for local paths or missing dates...`);
      let updatedCount = 0;
      
      for (const target of pdfsToSeed) {
        const record = existingPdfs.find(r => r.title === target.title);
        if (record) {
          const needsFilePathUpdate = !record.file_path.startsWith('http');
          const needsDateUpdate = target.documentDate && (!record.documentDate || record.documentDate.toISOString() !== new Date(target.documentDate).toISOString());
          
          if (needsFilePathUpdate || needsDateUpdate) {
            await record.update({ 
              file_path: target.file_path,
              documentDate: target.documentDate || record.documentDate
            });
            updatedCount++;
          }
        }
      }
      
      if (updatedCount > 0) {
        console.log(`[Seed] Updated ${updatedCount} records with actual dates and Cloudinary URLs.`);
      } else {
        console.log('[Seed] All existing records are already up to date.');
      }
    }
  } catch (err) {
    console.error('[Seed] Failed to sync/seed PDFs:', err.message);
  }
}

module.exports = { seedPdfsIfEmpty };
