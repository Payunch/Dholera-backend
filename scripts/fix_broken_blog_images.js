const { Update } = require('../models');

// Curated high-resolution Cloudinary URLs for Dholera topics
const THEMATIC_IMAGES = {
  semiconductor: 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1794806537/dholera/images/dholera-semiconductor-plots-2026-tp2-cluster-cover-nov15.jpg',
  expressway: 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1794806547/dholera/images/dholera-expressway-land-2026-corridor-cover-nov16.jpg',
  airport: 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1794131365/dholera/images/dholera-airport-plots-2026-aerocity-aerial-cover-nov08.jpg',
  abcd_building: 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1794394460/dholera/images/dholera-diwali-plot-offers-2026-township-cover-nov09.jpg',
  commercial: 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1793904249/dholera/images/dholera-commercial-plots-2026-aerial-corridor-nov04.jpg',
  residential: 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1793904259/dholera/images/dholera-residential-land-2026-aerial-cover-nov05.jpg',
  registry: 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1793904268/dholera/images/dholera-plot-registry-2026-office-cover-nov06.jpg',
  land_prices: 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1793989985/dholera/images/dholera-land-prices-2026-demarcated-aerial-cover-nov07.jpg',
  smart_city: 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1793588134/dholera/images/dholera-smart-city-plots-township-cover-2026-nov02.jpg',
  investment: 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1793675856/dholera/images/dholera-land-investment-2026-prime-plots-aerial-cover-nov03.jpg',
  tp_maps: 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1794663048/dholera/images/dholera-labh-pacham-land-2026-sunrise-cover-nov14.jpg',
  industrial: 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1794663043/dholera/images/dholera-choth-plot-demand-2026-aerial-cover-nov13.jpg'
};

function pickBestImage(title, content) {
  const text = `${title} ${content || ''}`.toLowerCase();
  if (text.includes('semiconductor') || text.includes('tata') || text.includes('chip') || text.includes('fab')) {
    return THEMATIC_IMAGES.semiconductor;
  }
  if (text.includes('airport') || text.includes('aviation') || text.includes('aerocity') || text.includes('flight')) {
    return THEMATIC_IMAGES.airport;
  }
  if (text.includes('expressway') || text.includes('route') || text.includes('highway') || text.includes('metro')) {
    return THEMATIC_IMAGES.expressway;
  }
  if (text.includes('abcd') || text.includes('command') || text.includes('center')) {
    return THEMATIC_IMAGES.abcd_building;
  }
  if (text.includes('registry') || text.includes('legal') || text.includes('7/12') || text.includes('title') || text.includes('scam') || text.includes('cheat') || text.includes('approved')) {
    return THEMATIC_IMAGES.registry;
  }
  if (text.includes('commercial') || text.includes('shop') || text.includes('office') || text.includes('fsi')) {
    return THEMATIC_IMAGES.commercial;
  }
  if (text.includes('residential') || text.includes('villa') || text.includes('township') || text.includes('greenz')) {
    return THEMATIC_IMAGES.residential;
  }
  if (text.includes('price') || text.includes('rate') || text.includes('cost') || text.includes('sq yard')) {
    return THEMATIC_IMAGES.land_prices;
  }
  if (text.includes('map') || text.includes('tp1') || text.includes('tp2') || text.includes('town planning') || text.includes('sector')) {
    return THEMATIC_IMAGES.tp_maps;
  }
  if (text.includes('industrial') || text.includes('factory') || text.includes('manufacturing')) {
    return THEMATIC_IMAGES.industrial;
  }
  return THEMATIC_IMAGES.investment;
}

async function fixBrokenImages() {
  const posts = await Update.findAll();
  let updatedCount = 0;

  for (const p of posts) {
    const isBrokenDholeraHub = p.imageUrl && p.imageUrl.includes('dholerahub.com');
    const isMissing = !p.imageUrl;
    const contentHasDholeraHub = p.content && p.content.includes('dholerahub.com');

    if (isBrokenDholeraHub || isMissing || contentHasDholeraHub) {
      const bestImg = pickBestImage(p.title, p.content);
      
      let newContent = p.content;
      if (contentHasDholeraHub) {
        newContent = newContent.replace(/https:\/\/dholerahub\.com\/[^\s"'<>)]+/g, bestImg);
      }

      p.imageUrl = bestImg;
      p.content = newContent;
      await p.save();

      console.log(`[FIXED] ID ${p.id}: "${p.title.slice(0, 35)}..." -> ${bestImg.slice(0, 60)}...`);
      updatedCount++;
    }
  }

  console.log(`\nSuccessfully repaired ${updatedCount} blog posts with verified Cloudinary imagery!`);
}

fixBrokenImages().catch(console.error);
