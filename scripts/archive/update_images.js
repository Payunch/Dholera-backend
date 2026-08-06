const { Sequelize } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: '/home/opc/Dholera-backend/data/database.sqlite',
  logging: false
});

async function run() {
  await sequelize.query('UPDATE Updates SET imageUrl = \'/uploads/4.1.jpg\' WHERE title LIKE \'Smart Infrastructure%\'');
  await sequelize.query('UPDATE Updates SET imageUrl = \'/uploads/5.1.jpg\' WHERE title LIKE \'Why the Upcoming Dholera Airport%\'');
  await sequelize.query('UPDATE Updates SET imageUrl = \'/uploads/6.1.jpg\' WHERE title LIKE \'The Knowledge & IT Zone%\'');
  console.log('Images updated');
}
run();
