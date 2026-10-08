// Query all draft/unpublished posts from the production database
require('dotenv').config();
const sequelize = require('./config/database');
const { Update } = require('./models');

async function listDrafts() {
  await sequelize.sync();
  
  // Get ALL posts - both published and unpublished
  const all = await Update.findAll({
    where: { lang: 'en' },
    order: [['id', 'ASC']],
    attributes: ['id', 'title', 'published', 'isApproved', 'publishedAt', 'category', 'slug', 'title_gu', 'title_hi', 'seoTitle', 'seoDescription', 'author']
  });

  console.log(`\n=== TOTAL ENGLISH POSTS: ${all.length} ===\n`);
  
  const drafts = all.filter(u => !u.published || !u.isApproved);
  const published = all.filter(u => u.published && u.isApproved);
  const noTranslation = all.filter(u => !u.title_gu || !u.title_hi);
  
  console.log(`Published: ${published.length}`);
  console.log(`Drafts (unpublished/unapproved): ${drafts.length}`);
  console.log(`Missing translations: ${noTranslation.length}\n`);
  
  console.log('--- DRAFT POSTS ---');
  for (const d of drafts) {
    console.log(`  ID: ${d.id} | Title: "${d.title}" | published=${d.published} | approved=${d.isApproved} | date=${d.publishedAt} | cat=${d.category}`);
  }
  
  console.log('\n--- ALL POSTS (translation status) ---');
  for (const p of all) {
    const hasGu = p.title_gu ? '✓' : '✗';
    const hasHi = p.title_hi ? '✓' : '✗';
    console.log(`  ID: ${p.id} | "${p.title?.substring(0, 60)}" | pub=${p.published} | GU:${hasGu} HI:${hasHi} | SEO: ${p.seoTitle ? '✓' : '✗'}`);
  }
  
  process.exit();
}

listDrafts().catch(err => { console.error(err); process.exit(1); });
