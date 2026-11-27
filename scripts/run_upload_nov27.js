const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { cloudinary } = require('../services/cloudinary');

const images = [
  {
    filePath: 'C:\\Users\\solan\\.gemini\\antigravity\\brain\\61fd9dcb-8c9d-49e0-b4ec-990faee57392\\dholera_sir_tp2_semiconductor_corridor_1795752280117.jpg',
    publicId: 'dholera-news-27nov2026-tata-fab-tp2-cover',
    key: 'cover'
  },
  {
    filePath: 'C:\\Users\\solan\\.gemini\\antigravity\\brain\\61fd9dcb-8c9d-49e0-b4ec-990faee57392\\ahmedabad_dholera_expressway_aerial_1795752279119.jpg',
    publicId: 'dholera-news-27nov2026-expressway-toll-fig2',
    key: 'fig2'
  },
  {
    filePath: 'C:\\Users\\solan\\.gemini\\antigravity\\brain\\61fd9dcb-8c9d-49e0-b4ec-990faee57392\\dholera_tp1_field_inspection_v2_1795752304182.jpg',
    publicId: 'dholera-news-27nov2026-tp1-plot-survey-fig3',
    key: 'fig3'
  }
];

async function uploadAll() {
  const results = {};

  for (const img of images) {
    if (!fs.existsSync(img.filePath)) {
      throw new Error(`File does not exist: ${img.filePath}`);
    }
    console.log(`[Cloudinary] Uploading ${img.publicId}...`);
    const res = await cloudinary.uploader.upload(img.filePath, {
      folder: 'dholera/images',
      public_id: img.publicId,
      overwrite: true,
      resource_type: 'image'
    });
    console.log(`[Cloudinary] Uploaded ${img.key}: ${res.secure_url}`);
    results[img.key] = res.secure_url;
  }

  const outPath = path.join(__dirname, 'uploaded_nov27_image_urls.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));
  console.log(`Saved URLs to ${outPath}`);
  console.log(JSON.stringify(results, null, 2));
}

uploadAll().catch(err => {
  console.error(err);
  process.exit(1);
});
