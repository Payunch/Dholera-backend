const { sequelize } = require('../models');

async function checkDate() {
  try {
    const [rows] = await sequelize.query('SELECT id, title, slug, published, isApproved, publishedAt, createdAt FROM Updates WHERE id IN (250, 251, 252, 253)');
    console.log(rows);
  } catch (e) {
    console.error(e);
  } finally {
    await sequelize.close();
  }
}

checkDate();
