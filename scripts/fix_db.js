const { sequelize } = require('../models/index');

async function fixTable() {
  try {
    await sequelize.query('ALTER TABLE "Updates" ADD COLUMN original_id INTEGER;');
    await sequelize.query('ALTER TABLE "Updates" ADD COLUMN lang VARCHAR(255) DEFAULT \'en\';');
    console.log('Columns added successfully');
  } catch (err) {
    console.error('Error adding columns:', err.message);
  }
  process.exit(0);
}

fixTable();
