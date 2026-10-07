require('dotenv').config();
const { Update } = require('./models');

async function main() {
  const all = await Update.findAll({
    where: { lang: 'en' },
    order: [['id', 'ASC']],
    attributes: ['id', 'title', 'published', 'isApproved', 'publishedAt', 'title_gu', 'title_hi', 'seoTitle', 'seoDescription', 'category', 'slug']
  });

  console.log(`TOTAL ENGLISH POSTS: ${all.length}`);
  const drafts = all.filter(p => !p.published || !p.isApproved);
  const live = all.filter(p => p.published && p.isApproved);
  console.log(`Live: ${live.length}`);
  console.log(`Drafts: ${drafts.length}`);

  console.log('\n--- DRAFTS (' + drafts.length + ') ---');
  drafts.forEach(p => {
    const dStr = p.publishedAt ? new Date(p.publishedAt).toISOString().split('T')[0] : 'NO_DATE';
    console.log(`ID:${p.id} | Pub:${p.published} | Appr:${p.isApproved} | Date:${dStr} | SEO:${p.seoTitle ? 'YES' : 'NO'} | HI:${!!p.title_hi} | GU:${!!p.title_gu} | "${p.title}"`);
  });

  console.log('\n--- LIVE (' + live.length + ') ---');
  live.forEach(p => {
    const dStr = p.publishedAt ? new Date(p.publishedAt).toISOString().split('T')[0] : 'NO_DATE';
    console.log(`ID:${p.id} | Date:${dStr} | SEO:${p.seoTitle ? 'YES' : 'NO'} | HI:${!!p.title_hi} | GU:${!!p.title_gu} | "${p.title}"`);
  });

  process.exit();
}

main().catch(err => { console.error(err); process.exit(1); });
