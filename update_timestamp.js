const { Update } = require('./models');
const { Op } = require('sequelize');

async function run() {
  try {
    const [affectedRows] = await Update.update(
      { publishedAt: new Date(), updatedAt: new Date() },
      { 
        where: { 
          [Op.or]: [
            { title: { [Op.like]: '%Ahmedabad Metro Phase 3%' } },
            { title: { [Op.like]: '%Western Railway%' } }
          ]
        } 
      }
    );
    console.log(`Timestamps updated on production. Affected rows: ${affectedRows}`);
  } catch (err) {
    console.error(err);
  } finally {
    process.exit(0);
  }
}

run();
