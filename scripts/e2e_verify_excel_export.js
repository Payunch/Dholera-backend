const path = require('path');
const fs = require('fs');

process.env.DATABASE_URL = process.env.DATABASE_URL || './e2e_export_db.sqlite';
process.env.DB_SYNC_ALTER = 'true';
process.env.NODE_ENV = 'development';

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supertest = require('supertest');
const { sequelize, Lead } = require('../models');
const app = require('../index');

async function run() {
  console.log('[XLSX E2E] Connecting to DB...');
  await sequelize.authenticate();
  console.log('[XLSX E2E] Rebuilding test DB...');
  await sequelize.sync({ force: true });

  const now = new Date();
  await Lead.create({
    name: 'Excel Export Test',
    phone: '9999999999',
    email: 'excel@test.local',
    source: 'e2e-export',
    verified: true,
    status: 'New',
    createdAt: now,
    updatedAt: now
  });

  const agent = supertest.agent(app);
  const csrfRes = await agent.get('/api/auth/csrf-token');
  if (csrfRes.statusCode !== 200 || !csrfRes.body?.csrfToken) {
    throw new Error(`Failed to fetch CSRF token: ${csrfRes.statusCode} ${JSON.stringify(csrfRes.body)}`);
  }

  const loginRes = await agent
    .post('/api/auth/login')
    .set('X-CSRF-Token', csrfRes.body.csrfToken)
    .send({
      username: process.env.ADMIN_USER || 'admin',
      password: process.env.ADMIN_PASS || 'admin123'
    });

  if (loginRes.statusCode !== 200) {
    throw new Error(`Login failed with status ${loginRes.statusCode}: ${JSON.stringify(loginRes.body)}`);
  }

  const exportRes = await agent
    .get('/api/leads/export')
    .buffer(true)
    .parse((res, callback) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      res.on('end', () => callback(null, Buffer.concat(chunks)));
    });
  if (exportRes.statusCode !== 200) {
    throw new Error(`Export failed with status ${exportRes.statusCode}: ${JSON.stringify(exportRes.body)}`);
  }

  const contentType = exportRes.headers['content-type'] || '';
  if (!contentType.includes('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
    throw new Error(`Unexpected content-type: ${contentType}`);
  }

  const buffer = Buffer.isBuffer(exportRes.body) ? exportRes.body : Buffer.from(exportRes.body);
  if (buffer.length < 4 || buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new Error('Exported file does not look like a valid XLSX zip archive');
  }

  const outFile = path.join(__dirname, '..', 'e2e_leads_export.xlsx');
  fs.writeFileSync(outFile, buffer);
  console.log('[XLSX E2E] Export verified:', {
    statusCode: exportRes.statusCode,
    contentType,
    file: outFile,
    bytes: buffer.length
  });
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[XLSX E2E] Fatal:', err.message);
    process.exit(1);
  });
