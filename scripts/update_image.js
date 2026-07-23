const sequelize = require('../config/database');
const Update = require('../models/Update');

async function run() {
    try {
        await sequelize.authenticate();
        await Update.update({ imageUrl: '/uploads/6.1.jpg' }, { where: { id: 179 } });
        console.log('Successfully updated image for blog 179');
    } catch (e) {
        console.error(e);
    }
}
run();
