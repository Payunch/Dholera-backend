const path = require('path');
const fs = require('fs');

// Ensure correct persistent path if on Oracle Cloud production
if (fs.existsSync('/data/database.sqlite')) {
  process.env.STORAGE_DIR = '/data';
}

const { Update, sequelize } = require('../models');
const { Op } = require('sequelize');

async function findDholeraHub() {
  try {
    await sequelize.authenticate();
    console.log('[DB] Connected successfully to:', sequelize.config.storage || sequelize.options.storage);

    // Find any post containing dholerahub in title, content, imageUrl, slug, seoTitle, seoDescription, seoKeywords
    const posts = await Update.findAll({
      where: {
        [Op.or]: [
          { title: { [Op.like]: '%dholerahub%' } },
          { content: { [Op.like]: '%dholerahub%' } },
          { imageUrl: { [Op.like]: '%dholerahub%' } },
          { slug: { [Op.like]: '%dholerahub%' } },
          { seoTitle: { [Op.like]: '%dholerahub%' } },
          { seoDescription: { [Op.like]: '%dholerahub%' } },
          { seoKeywords: { [Op.like]: '%dholerahub%' } }
        ]
      }
    });

    console.log(`\n=== Found ${posts.length} posts matching "dholerahub" ===`);
    posts.forEach(p => {
      console.log(`\n[ID ${p.id}] Slug: "${p.slug}"`);
      console.log(`Title: ${p.title}`);
      console.log(`ImageUrl: ${p.imageUrl}`);
      const inContent = p.content && p.content.toLowerCase().includes('dholerahub');
      const inTitle = p.title && p.title.toLowerCase().includes('dholerahub');
      const inImg = p.imageUrl && p.imageUrl.toLowerCase().includes('dholerahub');
      const inSlug = p.slug && p.slug.toLowerCase().includes('dholerahub');
      console.log(`Matches -> inContent: ${inContent}, inTitle: ${inTitle}, inImg: ${inImg}, inSlug: ${inSlug}`);
      
      if (inContent) {
        // Show snippet of content where dholerahub appears
        const idx = p.content.toLowerCase().indexOf('dholerahub');
        const snippet = p.content.substring(Math.max(0, idx - 50), Math.min(p.content.length, idx + 100));
        console.log(`Content Snippet around match: ...${snippet.replace(/\n/g, ' ')}...`);
      }
    });

    // Check all posts total count
    const totalCount = await Update.count();
    console.log(`\nTotal updates/posts in database: ${totalCount}`);

    // Let's also check other tables in SQLite for any mention of dholerahub
    const [tables] = await sequelize.query("SELECT tbl_name FROM sqlite_master WHERE type='table'");
    console.log('\nChecking all tables for references to "dholerahub":');
    for (const t of tables) {
      const tableName = t.tbl_name;
      if (['sqlite_sequence', 'UserSessions'].includes(tableName)) continue;
      try {
        const [results] = await sequelize.query(`SELECT * FROM \`${tableName}\``);
        let matchesInTable = 0;
        for (const row of results) {
          const rowStr = JSON.stringify(row).toLowerCase();
          if (rowStr.includes('dholerahub')) {
            matchesInTable++;
            console.log(`Table "${tableName}" row matched: ID ${row.id || 'N/A'}`);
          }
        }
        if (matchesInTable > 0) {
          console.log(`--> Table "${tableName}" has ${matchesInTable} matching rows.`);
        }
      } catch (err) {
        // ignore
      }
    }

  } catch (error) {
    console.error('Error finding dholerahub posts:', error);
  } finally {
    await sequelize.close();
  }
}

findDholeraHub();
