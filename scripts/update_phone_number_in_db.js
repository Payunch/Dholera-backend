const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

async function updateDb(dbFilePath) {
  if (!fs.existsSync(dbFilePath)) {
    console.log(`Database file not found: ${dbFilePath}`);
    return;
  }
  console.log(`\n========================================`);
  console.log(`Updating database at: ${dbFilePath}`);
  console.log(`========================================`);

  const seq = new Sequelize({
    dialect: 'sqlite',
    storage: dbFilePath,
    logging: false
  });

  try {
    // 1. Updates table
    const [beforeUpdates] = await seq.query("SELECT COUNT(*) as cnt FROM Updates WHERE content LIKE '%74358%'");
    console.log(`Updates table rows with 74358 before: ${beforeUpdates[0].cnt}`);

    await seq.query(`
      UPDATE Updates
      SET content = REPLACE(content, '74358 08031', '82004 48270')
      WHERE content LIKE '%74358 08031%'
    `);

    await seq.query(`
      UPDATE Updates
      SET content = REPLACE(content, '74358-08031', '82004-48270')
      WHERE content LIKE '%74358-08031%'
    `);

    await seq.query(`
      UPDATE Updates
      SET content = REPLACE(content, '7435808031', '8200448270')
      WHERE content LIKE '%7435808031%'
    `);

    const [afterUpdates] = await seq.query("SELECT COUNT(*) as cnt FROM Updates WHERE content LIKE '%74358%'");
    console.log(`Updates table rows with 74358 after: ${afterUpdates[0].cnt}`);

    // 2. Settings table
    try {
      const [settings] = await seq.query("SELECT * FROM Settings WHERE value LIKE '%74358%'");
      console.log(`Settings entries with 74358: ${settings.length}`);
      if (settings.length > 0) {
        await seq.query("UPDATE Settings SET value = REPLACE(value, '7435808031', '8200448270') WHERE value LIKE '%7435808031%'");
        await seq.query("UPDATE Settings SET value = REPLACE(value, '74358 08031', '82004 48270') WHERE value LIKE '%74358 08031%'");
      }
    } catch (e) {
      // Table might not exist in all copies
    }

    // Verify 8200448270 rows
    const [rowsWithNew] = await seq.query("SELECT COUNT(*) as cnt FROM Updates WHERE content LIKE '%8200448270%'");
    console.log(`Updates table rows with 8200448270 now: ${rowsWithNew[0].cnt}`);

  } catch (err) {
    console.error(`Error updating ${dbFilePath}:`, err.message);
  } finally {
    await seq.close();
  }
}

async function main() {
  const localDb = path.resolve(__dirname, '../data/database.sqlite');
  const rootLiveDb = path.resolve(__dirname, '../../live_database.sqlite');

  await updateDb(localDb);
  if (fs.existsSync(rootLiveDb)) {
    await updateDb(rootLiveDb);
  }
}

if (require.main === module) {
  main().then(() => {
    console.log('\nDatabase update completed successfully!');
    process.exit(0);
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { updateDb };
