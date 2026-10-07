const sequelize = require('./config/database');
const { Comment } = require('./models');

async function run() {
  try {
    await sequelize.authenticate();
    // Use alter to update table schema without dropping data
    await Comment.sync({ alter: true });
    console.log("Comments table migrated successfully.");
    process.exit(0);
  } catch(e) {
    console.log("Migration error:", e);
    process.exit(1);
  }
}
run();
