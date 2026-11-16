const { sequelize } = require('../models');

async function checkFirstPosts() {
  try {
    const [rows] = await sequelize.query("SELECT id, title, slug, content FROM Updates WHERE id IN (1, 4, 7, 10, 13)");
    for (const r of rows) {
      console.log(`ID ${r.id}: "${r.title}" | content len: ${r.content ? r.content.length : 0}`);
      console.log(`Snippet: ${r.content ? r.content.slice(0, 150) : ''}...`);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await sequelize.close();
  }
}

checkFirstPosts();
