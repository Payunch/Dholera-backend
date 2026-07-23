const sequelize = require('../config/database');
const Update = require('../models/Update');

async function run() {
    try {
        await sequelize.authenticate();
        await Update.update({ title: "The Knowledge & IT Zone in Dholera: India's Next Big Tech Hub" }, { where: { id: 179 } });
        console.log('Successfully updated title for blog 179');
    } catch (e) {
        console.error(e);
    }
}
run();
