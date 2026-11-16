const { sequelize } = require('../models');

async function inspectMatches() {
  try {
    const [rows] = await sequelize.query("SELECT * FROM Updates");
    console.log(`Total rows in Updates: ${rows.length}`);

    const dholeraHubPosts = [];
    for (const r of rows) {
      const keys = Object.keys(r);
      const matchedCols = [];
      for (const k of keys) {
        if (typeof r[k] === 'string' && r[k].toLowerCase().includes('dholerahub')) {
          matchedCols.push(k);
        }
      }
      if (matchedCols.length > 0) {
        dholeraHubPosts.push({
          id: r.id,
          title: r.title,
          slug: r.slug,
          matchedCols,
          createdAt: r.createdAt
        });
      }
    }

    console.log(`\n=== Found ${dholeraHubPosts.length} posts with "dholerahub" ===`);
    for (const p of dholeraHubPosts) {
      console.log(`ID: ${p.id} | Slug: ${p.slug} | Title: "${p.title}" | Matched in: ${p.matchedCols.join(', ')}`);
      // Let's print snippets from matched columns
      const [fullRow] = await sequelize.query(`SELECT * FROM Updates WHERE id = ${p.id}`);
      for (const col of p.matchedCols) {
        const text = fullRow[0][col];
        console.log(`  [${col}]: ${text.length > 300 ? text.slice(0, 300) + '...' : text}`);
      }
    }

    // Also check if any other tables have dholerahub
    const [tables] = await sequelize.query("SELECT tbl_name FROM sqlite_master WHERE type='table'");
    for (const t of tables) {
      if (['sqlite_sequence', 'UserSessions', 'Updates'].includes(t.tbl_name)) continue;
      try {
        const [results] = await sequelize.query(`SELECT * FROM \`${t.tbl_name}\``);
        for (const r of results) {
          const rStr = JSON.stringify(r);
          if (rStr.toLowerCase().includes('dholerahub')) {
            console.log(`Found in table ${t.tbl_name}, row:`, r);
          }
        }
      } catch (e) {}
    }

  } catch (err) {
    console.error(err);
  } finally {
    await sequelize.close();
  }
}

inspectMatches();
