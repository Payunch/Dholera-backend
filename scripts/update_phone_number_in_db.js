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
    const [tables] = await seq.query("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'");
    
    for (const t of tables) {
      const tableName = t.name;
      const [cols] = await seq.query(`PRAGMA table_info("${tableName}")`);
      
      for (const c of cols) {
        const colName = c.name;
        try {
          const [check] = await seq.query(`SELECT COUNT(*) as cnt FROM "${tableName}" WHERE "${colName}" LIKE '%74358%'`);
          if (check[0].cnt > 0) {
            console.log(`Found ${check[0].cnt} rows in [${tableName}].[${colName}]. Updating...`);
            
            await seq.query(`
              UPDATE "${tableName}"
              SET "${colName}" = REPLACE("${colName}", '74358 08031', '82004 48270')
              WHERE "${colName}" LIKE '%74358 08031%'
            `);
            
            await seq.query(`
              UPDATE "${tableName}"
              SET "${colName}" = REPLACE("${colName}", '74358-08031', '82004-48270')
              WHERE "${colName}" LIKE '%74358-08031%'
            `);
            
            await seq.query(`
              UPDATE "${tableName}"
              SET "${colName}" = REPLACE("${colName}", '7435808031', '8200448270')
              WHERE "${colName}" LIKE '%7435808031%'
            `);

            const [after] = await seq.query(`SELECT COUNT(*) as cnt FROM "${tableName}" WHERE "${colName}" LIKE '%74358%'`);
            console.log(`[${tableName}].[${colName}] now has ${after[0].cnt} rows with 74358.`);
          }
        } catch (e) {
          // ignore non-searchable columns
        }
      }
    }
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
    console.log('\nAll databases updated comprehensively!');
    process.exit(0);
  }).catch(err => {
    console.error(err);
    process.exit(1);
  });
}

module.exports = { updateDb };
