const { sequelize } = require('../models');

async function checkEverySingleDholeraHubLink() {
  try {
    const [rows] = await sequelize.query("SELECT * FROM Updates");
    console.log(`Checking ${rows.length} rows in Updates...`);

    const found = [];
    for (const r of rows) {
      for (const [col, val] of Object.entries(r)) {
        if (typeof val === 'string' && val.toLowerCase().includes('dholerahub')) {
          found.push({ id: r.id, title: r.title, col });
        }
      }
    }

    console.log(`\nFound ${found.length} column matches:`);
    found.forEach(f => {
      console.log(`Post ID ${f.id} (${f.title.slice(0, 40)}) -> column: ${f.col}`);
    });

  } catch (err) {
    console.error(err);
  } finally {
    await sequelize.close();
  }
}

checkEverySingleDholeraHubLink();
