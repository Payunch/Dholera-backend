const { sequelize } = require('../models');

async function inspectExactMatches() {
  try {
    const ids = [56, 58, 59, 64, 65, 66, 67, 68];
    for (const id of ids) {
      const [rows] = await sequelize.query(`SELECT id, title, content_gu, content_hi FROM Updates WHERE id = ${id}`);
      const r = rows[0];
      console.log(`\n================== ID ${r.id}: ${r.title} ==================`);
      if (r.content_gu && r.content_gu.toLowerCase().includes('dholerahub')) {
        const matches = r.content_gu.match(/https?:\/\/[^\s"'<>)]*dholerahub[^\s"'<>)]*/gi);
        console.log(`GU matches (${matches ? matches.length : 0}):`, matches);
      }
      if (r.content_hi && r.content_hi.toLowerCase().includes('dholerahub')) {
        const matches = r.content_hi.match(/https?:\/\/[^\s"'<>)]*dholerahub[^\s"'<>)]*/gi);
        console.log(`HI matches (${matches ? matches.length : 0}):`, matches);
      }
    }
  } catch (e) {
    console.error(e);
  } finally {
    await sequelize.close();
  }
}

inspectExactMatches();
