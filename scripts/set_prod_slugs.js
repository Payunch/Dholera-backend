const { Update } = require('../models');

async function setSlugs() {
  await Update.update(
    { slug: 'dholera-tp1-vs-tp2-plot-prices-2026-land-rates-zoning-roi' },
    { where: { id: 245 } }
  );
  await Update.update(
    { slug: 'how-to-verify-collector-na-7-12-land-title-dholera-sir-checklist' },
    { where: { id: 246 } }
  );
  console.log('Production slugs for 245 and 246 updated successfully!');
}

setSlugs().catch(console.error);
