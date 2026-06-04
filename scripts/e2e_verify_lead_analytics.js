require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const path = require('path');
const { Lead, Update, VisitorSession, sequelize } = require('../models');
const { Op } = require('sequelize');

async function run() {
  // use a separate DB for the e2e run to avoid touching production DB
  process.env.DATABASE_URL = process.env.DATABASE_URL || './e2e_db.sqlite';
  process.env.DB_SYNC_ALTER = 'true';

  console.log('[E2E] Connecting to DB...');
  try {
    await sequelize.authenticate();
    console.log('[E2E] DB connected. Syncing models (force clean test DB)...');
    await sequelize.sync({ force: true });
  } catch (err) {
    console.error('[E2E] DB error:', err.message);
    process.exit(1);
  }

  // Create a test lead for today using UTC boundaries so the result is stable
  const now = new Date();
  const utcYear = now.getUTCFullYear();
  const utcMonth = now.getUTCMonth();
  const utcDay = now.getUTCDate();
  const start = new Date(Date.UTC(utcYear, utcMonth, utcDay, 0, 0, 0, 0));
  const end = new Date(Date.UTC(utcYear, utcMonth, utcDay, 23, 59, 59, 999));
  const phone = '7435808031';
  console.log('[E2E] Creating test lead', phone);
  const [lead, created] = await Lead.findOrCreate({
    where: { phone },
    defaults: {
      name: 'E2E Test',
      phone,
      source: 'e2e-test',
      verified: true,
      createdAt: start,
      updatedAt: start
    }
  });

  if (!created) {
    // update createdAt to the UTC day start to ensure it falls inside the range
    await lead.update({ createdAt: start, updatedAt: start });
  }

  // Fetch leads/updates/visitors in range and compute daily metrics
  const leads = await Lead.findAll({ where: { createdAt: { [Op.between]: [start, end] } }, attributes: ['createdAt'] });
  const updates = await Update.findAll({ where: { createdAt: { [Op.between]: [start, end] } }, attributes: ['createdAt'] });
  const visitors = await VisitorSession.findAll({ where: { createdAt: { [Op.between]: [start, end] } }, attributes: ['createdAt', 'browserFingerprint'] });

  const groupByDate = (items) => items.reduce((acc, item) => {
    const dateStr = new Date(item.createdAt).toISOString().split('T')[0];
    acc[dateStr] = (acc[dateStr] || 0) + 1;
    return acc;
  }, {});

  const visitorsByDate = visitors.reduce((acc, item) => {
    const dateStr = new Date(item.createdAt).toISOString().split('T')[0];
    acc[dateStr] = acc[dateStr] || new Set();
    acc[dateStr].add(item.browserFingerprint);
    return acc;
  }, {});

  const groupedLeads = groupByDate(leads);
  const groupedUpdates = groupByDate(updates);

  const dateStr = start.toISOString().split('T')[0];
  const result = {
    date: dateStr,
    leads: groupedLeads[dateStr] || 0,
    updates: groupedUpdates[dateStr] || 0,
    visitors: visitorsByDate[dateStr] ? visitorsByDate[dateStr].size : 0
  };

  console.log('[E2E] Daily metrics for', dateStr, result);
  console.log('[E2E] Cleaning up test lead (optional)');
  // Optionally remove the test lead to keep DB clean
  // await lead.destroy();

  process.exit(0);
}

run().catch(err => {
  console.error('[E2E] Fatal:', err);
  process.exit(1);
});
