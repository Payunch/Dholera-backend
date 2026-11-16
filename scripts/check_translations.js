const { sequelize } = require('../models');

async function checkTranslations() {
  try {
    const [rows] = await sequelize.query('SELECT id, title, original_id, lang FROM Updates WHERE original_id BETWEEN 45 AND 68');
    console.log('Translations linked to 45-68:', rows);
  } catch (e) {
    console.error(e);
  } finally {
    await sequelize.close();
  }
}

checkTranslations();
