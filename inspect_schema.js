require('dotenv').config();
const sequelize = require('./config/database');

async function main() {
  const [cols] = await sequelize.query('PRAGMA table_info(Updates);');
  console.log('Columns in Updates table:');
  cols.forEach(c => console.log(`  - ${c.name} (${c.type})`));
  process.exit();
}

main().catch(err => { console.error(err); process.exit(1); });
