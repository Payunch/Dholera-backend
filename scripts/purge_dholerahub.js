const { sequelize, Update } = require('../models');
const { Op } = require('sequelize');

async function purgeDholeraHub() {
  try {
    await sequelize.authenticate();
    console.log('[DB] Connected to database.');

    // 1. Identify posts originating from dholerahub.com (the 23 WordPress migrated posts + 2 translations)
    const targetPostIds = [
      45, 46, 48, 49, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68,
      79, 80
    ];

    console.log(`\n[1/4] Preparing to remove ${targetPostIds.length} blogs imported from dholerahub.com...`);
    const postsToDelete = await Update.findAll({
      where: { id: { [Op.in]: targetPostIds } },
      attributes: ['id', 'title', 'slug']
    });

    console.log(`Found ${postsToDelete.length} matching posts in database:`);
    postsToDelete.forEach(p => console.log(`  - [ID ${p.id}] "${p.title}" (slug: ${p.slug})`));

    // Delete them
    const deleteCount = await Update.destroy({
      where: { id: { [Op.in]: targetPostIds } }
    });
    console.log(`\n[✓] Successfully deleted ${deleteCount} blogs originating from dholerahub.com.`);

    // 2. Sanitize any remaining posts for any lingering dholerahub links or images
    console.log('\n[2/4] Scanning all remaining posts for any dholerahub links, images, or mentions...');
    const remainingPosts = await Update.findAll();
    console.log(`Auditing ${remainingPosts.length} remaining posts...`);

    let sanitizedCount = 0;
    const fallbackImage = 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1794806547/dholera/images/dholera-expressway-land-2026-corridor-cover-nov16.jpg';

    for (const p of remainingPosts) {
      let changed = false;

      // Check imageUrl
      if (p.imageUrl && p.imageUrl.toLowerCase().includes('dholerahub')) {
        p.imageUrl = fallbackImage;
        changed = true;
      }

      // Check content
      if (p.content && p.content.toLowerCase().includes('dholerahub')) {
        p.content = p.content
          .replace(/https?:\/\/(?:www\.)?dholerahub\.com\/[^\s"'<>)]+/gi, fallbackImage)
          .replace(/https?:\/\/(?:www\.)?dholerahub\.com/gi, 'https://dholeraplatform.com')
          .replace(/dholerahub\.com/gi, 'dholeraplatform.com')
          .replace(/dholerahub/gi, 'DholeraPlatform');
        changed = true;
      }

      // Check content_gu
      if (p.content_gu && p.content_gu.toLowerCase().includes('dholerahub')) {
        p.content_gu = p.content_gu
          .replace(/https?:\/\/(?:www\.)?dholerahub\.com\/[^\s"'<>)]+/gi, fallbackImage)
          .replace(/https?:\/\/(?:www\.)?dholerahub\.com/gi, 'https://dholeraplatform.com')
          .replace(/dholerahub\.com/gi, 'dholeraplatform.com')
          .replace(/dholerahub/gi, 'DholeraPlatform');
        changed = true;
      }

      // Check content_hi
      if (p.content_hi && p.content_hi.toLowerCase().includes('dholerahub')) {
        p.content_hi = p.content_hi
          .replace(/https?:\/\/(?:www\.)?dholerahub\.com\/[^\s"'<>)]+/gi, fallbackImage)
          .replace(/https?:\/\/(?:www\.)?dholerahub\.com/gi, 'https://dholeraplatform.com')
          .replace(/dholerahub\.com/gi, 'dholeraplatform.com')
          .replace(/dholerahub/gi, 'DholeraPlatform');
        changed = true;
      }

      if (changed) {
        await p.save();
        console.log(`[SANITIZED] Post ID ${p.id}: "${p.title}"`);
        sanitizedCount++;
      }
    }
    console.log(`[✓] Sanitized ${sanitizedCount} remaining posts.`);

    // 3. Scan ALL tables in SQLite for any remaining occurrence of 'dholerahub'
    console.log('\n[3/4] Final verification across all database tables...');
    const [tables] = await sequelize.query("SELECT tbl_name FROM sqlite_master WHERE type='table'");
    let totalLingeringMatches = 0;

    for (const t of tables) {
      if (['sqlite_sequence', 'UserSessions'].includes(t.tbl_name)) continue;
      try {
        const [rows] = await sequelize.query(`SELECT * FROM \`${t.tbl_name}\``);
        for (const row of rows) {
          const rowStr = JSON.stringify(row).toLowerCase();
          if (rowStr.includes('dholerahub')) {
            console.warn(`[WARNING] Table "${t.tbl_name}" row still has dholerahub:`, row.id || row);
            totalLingeringMatches++;
          }
        }
      } catch (e) {}
    }

    if (totalLingeringMatches === 0) {
      console.log('✅ 100% CLEAN! Zero references to "dholerahub" exist in the entire database.');
    } else {
      console.warn(`⚠️ Found ${totalLingeringMatches} lingering occurrences.`);
    }

    // 4. Print remaining database summary
    const finalPostCount = await Update.count();
    console.log(`\n[4/4] Active posts remaining in database: ${finalPostCount}`);

  } catch (err) {
    console.error('Error during purge:', err);
  } finally {
    await sequelize.close();
  }
}

purgeDholeraHub();
