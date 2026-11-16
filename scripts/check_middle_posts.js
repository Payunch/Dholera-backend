const { sequelize } = require('../models');

async function checkMiddlePosts() {
  try {
    const [rows] = await sequelize.query("SELECT id, title, slug, createdAt, original_id FROM Updates WHERE id > 70 AND id < 224 ORDER BY id ASC");
    console.log(`Middle rows count: ${rows.length}`);
    for (const r of rows) {
      console.log(`ID ${r.id}: "${r.title.slice(0, 45)}" | orig: ${r.original_id} | date: ${r.createdAt}`);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await sequelize.close();
  }
}

checkMiddlePosts();
