// Check for unpublished/draft posts on the server
// Run this on the production server via SSH
require('dotenv').config();
const sequelize = require('./config/database');
const { Update } = require('./models');

async function checkDrafts() {
  await sequelize.sync();
  
  // Get ALL posts including unpublished
  const all = await Update.findAll({
    where: { lang: 'en' },
    order: [['id', 'ASC']],
    attributes: ['id', 'title', 'published', 'isApproved', 'publishedAt', 'category', 'slug', 'title_gu', 'title_hi', 'seoTitle', 'seoDescription', 'author', 'content']
  });

  console.log(`\n=== TOTAL ENGLISH POSTS: ${all.length} ===\n`);
  
  const drafts = all.filter(u => !u.published || !u.isApproved);
  const published = all.filter(u => u.published && u.isApproved);
  
  console.log(`Published: ${published.length}`);
  console.log(`Drafts (unpublished/unapproved): ${drafts.length}\n`);
  
  console.log('--- ALL POSTS ---');
  for (const d of all) {
    const status = (d.published && d.isApproved) ? 'LIVE' : 'DRAFT';
    const contentLen = d.content ? d.content.length : 0;
    console.log(`  ID:${d.id} | ${status} | cat="${d.category}" | slug="${d.slug}" | content=${contentLen} chars | seo=${d.seoTitle ? 'YES' : 'NO'} | "${d.title}"`);
  }
  
  if (drafts.length > 0) {
    console.log('\n--- DRAFT DETAILS ---');
    for (const d of drafts) {
      console.log(`\n  ID: ${d.id}`);
      console.log(`  Title: "${d.title}"`);
      console.log(`  Published: ${d.published}`);
      console.log(`  Approved: ${d.isApproved}`);
      console.log(`  Date: ${d.publishedAt}`);
      console.log(`  Category: ${d.category}`);
      console.log(`  SEO Title: ${d.seoTitle}`);
      console.log(`  SEO Desc: ${d.seoDescription}`);
      console.log(`  Content Length: ${d.content?.length || 0}`);
    }
  }
  
  process.exit();
}

checkDrafts().catch(err => { console.error(err); process.exit(1); });
