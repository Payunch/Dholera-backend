/**
 * Import blog posts from blog_export_with_translations.json into the database.
 * Run this on the production server after uploading the JSON file.
 * 
 * Usage: node import_blog.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Update, sequelize } = require('./models');
const fs = require('fs');

async function main() {
  await sequelize.sync();

  const filePath = path.join(__dirname, 'blog_export_with_translations.json');
  if (!fs.existsSync(filePath)) {
    console.error('File not found: blog_export_with_translations.json');
    console.error('Upload it to the server first using scp.');
    process.exit(1);
  }

  const posts = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`Found ${posts.length} posts to import.`);

  // Track the original_id mapping (local ID -> production ID)
  let englishId = null;

  for (const post of posts) {
    // Check if a post with the same title already exists
    const existing = await Update.findOne({ where: { title: post.title } });
    if (existing) {
      console.log(`[SKIP] Already exists (ID ${existing.id}): ${post.title.substring(0, 60)}`);
      if (post.lang === 'en') englishId = existing.id;
      continue;
    }

    // For translations, link to the English post's new production ID
    const createData = {
      title: post.title,
      content: post.content,
      category: post.category,
      imageUrl: post.imageUrl,
      imagePosition: post.imagePosition,
      published: true,
      publishedAt: new Date(),
      lang: post.lang,
      original_id: post.lang !== 'en' ? englishId : null,
      author: post.author,
      tags: post.tags,
      seoTitle: post.seoTitle,
      seoDescription: post.seoDescription,
      seoKeywords: post.seoKeywords
    };

    const created = await Update.create(createData);
    console.log(`[OK] Created ID ${created.id} (${post.lang}): ${post.title.substring(0, 60)}`);

    // Save the English post ID for linking translations
    if (post.lang === 'en') {
      englishId = created.id;
    }
  }

  console.log('');
  console.log('=== IMPORT COMPLETE ===');
  console.log('All posts are now live and published!');
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
