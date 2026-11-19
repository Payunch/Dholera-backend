const { uploadImages } = require('./upload_nov17_20_images');

const images = [
  {
    filePath: 'C:\\Users\\solan\\.gemini\\antigravity\\brain\\61fd9dcb-8c9d-49e0-b4ec-990faee57392\\dholera_tata_fab_tp2_1795111925953.jpg',
    publicId: 'dholera-news-nov2026-tata-fab-tp2-cover',
    key: 'cover'
  },
  {
    filePath: 'C:\\Users\\solan\\.gemini\\antigravity\\brain\\61fd9dcb-8c9d-49e0-b4ec-990faee57392\\ahmedabad_dholera_expressway_progress_1795111956556.jpg',
    publicId: 'dholera-news-nov2026-expressway-progress-fig2',
    key: 'fig2'
  },
  {
    filePath: 'C:\\Users\\solan\\.gemini\\antigravity\\brain\\61fd9dcb-8c9d-49e0-b4ec-990faee57392\\dholera_tp1_land_survey_registry_1795111981276.jpg',
    publicId: 'dholera-news-nov2026-tp1-land-survey-registry-fig3',
    key: 'fig3'
  }
];

uploadImages(images).then(res => {
  console.log('UPLOAD COMPLETE:', JSON.stringify(res, null, 2));
  process.exit(0);
}).catch(err => {
  console.error(err);
  process.exit(1);
});
