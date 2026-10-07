require('dotenv').config();
const { Update } = require('./models');

async function main() {
  const posts = await Update.findAll({
    where: { lang: 'en' },
    order: [['id', 'ASC']]
  });

  console.log(`Analyzing ${posts.length} posts:\n`);
  for (const p of posts) {
    const isLive = p.published && p.isApproved;
    console.log(`--------------------------------------------------`);
    console.log(`ID: ${p.id} | Status: ${isLive ? 'LIVE' : 'DRAFT'} | Date: ${p.publishedAt ? new Date(p.publishedAt).toISOString().split('T')[0] : 'NONE'}`);
    console.log(`Title: ${p.title}`);
    console.log(`Slug: ${p.slug}`);
    console.log(`Category: ${p.category}`);
    console.log(`SEO Title (${p.seoTitle ? p.seoTitle.length : 0} chars): ${p.seoTitle || 'MISSING'}`);
    console.log(`SEO Desc (${p.seoDescription ? p.seoDescription.length : 0} chars): ${p.seoDescription || 'MISSING'}`);
    console.log(`SEO Keywords: ${p.seoKeywords || 'MISSING'}`);
    console.log(`Tags: ${p.tags || 'MISSING'}`);
    console.log(`Alt Text: ${p.imageAltText || 'MISSING'}`);
    console.log(`Translations: HI=${p.title_hi ? 'YES' : 'NO'}, GU=${p.title_gu ? 'YES' : 'NO'}`);
  }
  process.exit();
}

main().catch(err => { console.error(err); process.exit(1); });
