const { sequelize } = require('../models');

async function listAllPostsDetailed() {
  try {
    const [rows] = await sequelize.query("SELECT id, title, slug, createdAt, updatedAt FROM Updates ORDER BY id ASC");
    console.log(`Total rows: ${rows.length}`);
    for (const r of rows) {
      console.log(`ID: ${r.id} | Slug: ${r.slug} | Created: ${r.createdAt} | Title: ${r.title}`);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await sequelize.close();
  }
}

listAllPostsDetailed();
