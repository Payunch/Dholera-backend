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

const img1Path = "C:/Users/solan/.gemini/antigravity-ide/brain/6eb750f7-a816-4d0e-9b1d-5935f2659238/dholera_airport_oct18_1792342049721.jpg";
const img2Path = "C:/Users/solan/.gemini/antigravity-ide/brain/6eb750f7-a816-4d0e-9b1d-5935f2659238/dholera_cargo_oct18_1792342071756.jpg";


async function upload() {
  console.log('Uploading Image 1 (Airport Aerial Runway)...');
  const res1 = await cloudinary.uploader.upload(img1Path, {
    folder: 'dholera/images',
    public_id: 'dholera-airport-runway-trials-2026-oct18',
    overwrite: true,
    resource_type: 'image'
  });
  console.log('Image 1 uploaded:', res1.secure_url);

  console.log('Uploading Image 2 (Airport Cargo Logistics)...');
  const res2 = await cloudinary.uploader.upload(img2Path, {
    folder: 'dholera/images',
    public_id: 'dholera-airport-cargo-terminal-2026-oct18',
    overwrite: true,
    resource_type: 'image'
  });
  console.log('Image 2 uploaded:', res2.secure_url);

  fs.writeFileSync(path.resolve(__dirname, 'uploaded_oct18_image_urls.json'), JSON.stringify({
    coverUrl: res1.secure_url,
    figureUrl: res2.secure_url
  }, null, 2));
}

upload().catch(err => {
  console.error('Upload failed:', err);
  process.exit(1);
});
