const bcrypt = require('bcrypt');
const { Lead } = require('../models');
const sequelize = require('../config/database');
const dotenv = require('dotenv');

dotenv.config();

async function main() {
  await sequelize.authenticate();
  const name = process.env.TEST_USER_NAME || 'Test User';
  const phone = process.env.TEST_USER_PHONE || '74358080310';
  const email = process.env.TEST_USER_EMAIL || 'testuser@example.com';
  const passcode = process.env.TEST_USER_PASSCODE || '123456';

  const salt = await bcrypt.genSalt(10);
  const hashed = await bcrypt.hash(passcode, salt);

  const [lead, created] = await Lead.findOrCreate({
    where: { phone },
    defaults: {
      name,
      phone,
      email,
      verified: true,
      is_registered: true,
      passcode: hashed
    }
  });

  if (!created) {
    await lead.update({
      name,
      email,
      verified: true,
      is_registered: true,
      passcode: hashed
    });
  }

  console.log('Test user created/updated:');
  console.log({ name, phone, email, passcode });
  process.exit(0);
}

main().catch(err => {
  console.error('Failed to create test user', err);
  process.exit(1);
});
