require('dotenv').config();
const { Update } = require('./models');

async function main() {
  const ids = [10, 13, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58];
  const posts = await Update.findAll({
    where: { id: ids },
    order: [['id', 'ASC']]
  });

  for (const p of posts) {
    console.log(`--------------------------------------------------`);
    console.log(`ID: ${p.id} | Status: ${p.published && p.isApproved ? 'LIVE' : 'DRAFT'} | Date: ${p.publishedAt ? new Date(p.publishedAt).toISOString().split('T')[0] : 'NONE'}`);
    console.log(`Title: ${p.title}`);
    console.log(`Slug: ${p.slug}`);
    console.log(`Category: ${p.category}`);
    console.log(`SEO Title (${p.seoTitle ? p.seoTitle.length : 0} chars): ${p.seoTitle || 'MISSING'}`);
    console.log(`SEO Desc (${p.seoDescription ? p.seoDescription.length : 0} chars): ${p.seoDescription || 'MISSING'}`);
    console.log(`SEO Keywords: ${p.seoKeywords || 'MISSING'}`);
    console.log(`Alt Text: ${p.imageAltText || 'MISSING'}`);
    console.log(`Content length: ${p.content ? p.content.length : 0}`);
  }
  process.exit();
}

main().catch(err => { console.error(err); process.exit(1); });
