const { sequelize } = require('../models');

async function comprehensiveCheck() {
  try {
    const [rows] = await sequelize.query("SELECT id, title, slug, imageUrl, content, content_gu, content_hi, author, tags, createdAt FROM Updates ORDER BY id ASC");
    
    console.log(`Auditing all ${rows.length} posts for dholerahub origin and content...`);
    
    const dholeraHubOrigin = [];
    const containsDholeraHubText = [];
    
    for (const r of rows) {
      const fullStr = JSON.stringify(r).toLowerCase();
      if (fullStr.includes('dholerahub')) {
        containsDholeraHubText.push({ id: r.id, title: r.title });
      }
      if (r.id >= 45 && r.id <= 68) {
        dholeraHubOrigin.push({ id: r.id, title: r.title, slug: r.slug });
      }
    }
    
    console.log(`\n1. Posts with dholerahub text in database (${containsDholeraHubText.length}):`);
    containsDholeraHubText.forEach(p => console.log(`  - ID ${p.id}: ${p.title}`));
    
    console.log(`\n2. Posts imported from dholerahub.com (WordPress migration on July 2, 2026) (${dholeraHubOrigin.length}):`);
    dholeraHubOrigin.forEach(p => console.log(`  - ID ${p.id}: "${p.title}" (slug: ${p.slug})`));

  } catch (e) {
    console.error(e);
  } finally {
    await sequelize.close();
  }
}

comprehensiveCheck();
