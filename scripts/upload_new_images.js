const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dhf36t4vw',
  api_key: process.env.CLOUDINARY_API_KEY || '226774187511981',
  api_secret: process.env.CLOUDINARY_API_SECRET || 'mh0pptQ6hcWj38sslhzwa_B6Gls',
  secure: true
});

const img1Path = "C:\\Users\\solan\\.gemini\\antigravity-ide\\brain\\6eb750f7-a816-4d0e-9b1d-5935f2659238\\dholera_sez_fab_1792260909201.jpg";
const img2Path = "C:\\Users\\solan\\.gemini\\antigravity-ide\\brain\\6eb750f7-a816-4d0e-9b1d-5935f2659238\\dholera_water_tp2_1792260926798.jpg";

async function upload() {
  console.log('Uploading Image 1 to Cloudinary...');
  const res1 = await cloudinary.uploader.upload(img1Path, {
    folder: 'dholera/images',
    public_id: 'dholera-semiconductor-sez-fab-2026-oct17',
    overwrite: true,
    resource_type: 'image'
  });
  console.log('Image 1 uploaded successfully:', res1.secure_url);

  console.log('Uploading Image 2 to Cloudinary...');
  const res2 = await cloudinary.uploader.upload(img2Path, {
    folder: 'dholera/images',
    public_id: 'dholera-100mld-water-pipeline-tp2-2026-oct17',
    overwrite: true,
    resource_type: 'image'
  });
  console.log('Image 2 uploaded successfully:', res2.secure_url);

  fs.writeFileSync(path.resolve(__dirname, 'uploaded_image_urls.json'), JSON.stringify({
    coverUrl: res1.secure_url,
    figureUrl: res2.secure_url
  }, null, 2));
}

upload().catch(err => {
  console.error('Upload failed:', err);
  process.exit(1);
});
