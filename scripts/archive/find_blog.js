const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Update, sequelize } = require('./models');

async function main() {
  await sequelize.sync();
  
  // Check how existing translations are linked (e.g., English ID 44 -> Hindi 45, Gujarati 46)
  const { Op } = require('sequelize');
  const translated = await Update.findAll({
    where: { original_id: { [Op.not]: null } },
    attributes: ['id', 'title', 'lang', 'original_id', 'author'],
    order: [['id', 'DESC']],
    limit: 10
  });

  console.log('=== EXISTING TRANSLATIONS ===');
  translated.forEach(p => {
    console.log(JSON.stringify({
      id: p.id,
      lang: p.lang,
      original_id: p.original_id,
      title: p.title.substring(0, 60)
    }));
  });

  // Check if post 58 already has translations
  const translations58 = await Update.findAll({
    where: { original_id: 58 },
    attributes: ['id', 'title', 'lang']
  });
  console.log('');
  console.log('=== TRANSLATIONS FOR POST 58 ===');
  if (translations58.length === 0) {
    console.log('No translations found for post 58');
  } else {
    translations58.forEach(p => console.log(JSON.stringify(p)));
  }

  // Export post 58 full content as JSON for transfer to production
  const post = await Update.findByPk(58);
  const fs = require('fs');
  const exportData = {
    title: post.title,
    content: post.content,
    category: post.category,
    imageUrl: post.imageUrl,
    imagePosition: post.imagePosition,
    published: post.published,
    publishedAt: post.publishedAt,
    lang: post.lang,
    author: post.author,
    tags: post.tags,
    seoTitle: post.seoTitle,
    seoDescription: post.seoDescription,
    seoKeywords: post.seoKeywords
  };
  fs.writeFileSync('blog_export_58.json', JSON.stringify(exportData, null, 2));
  console.log('');
  console.log('Exported post 58 to blog_export_58.json');

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
