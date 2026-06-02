/**
 * migrate_to_postgres.js
 * 
 * Migrates all data from the current SQLite database to a new PostgreSQL instance.
 * 
 * Usage:
 *   TARGET_DATABASE_URL=postgres://user:pass@host:port/db node scripts/migrate_to_postgres.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { Sequelize } = require('sequelize');
const models = require('../models');

const sourceSequelize = models.sequelize; // Current DB (SQLite)
const targetUrl = process.env.TARGET_DATABASE_URL;

if (!targetUrl) {
  console.error('❌ Error: TARGET_DATABASE_URL environment variable is required.');
  console.error('Usage: TARGET_DATABASE_URL=postgres://user:pass@host:port/db node scripts/migrate_to_postgres.js');
  process.exit(1);
}

const targetSequelize = new Sequelize(targetUrl, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  }
});

const tableOrder = [
  'Lead',
  'Update',
  'PdfDocument',
  'Analytics',
  'VisitorSession',
  'PdfView',
  'PdfPurchase',
  'AuditLog',
  'WhatsAppLog',
  'Setting',
  'UserSession',
  'ClearanceModel'
];

async function migrate() {
  try {
    console.log('[Source] Connecting to SQLite...');
    await sourceSequelize.authenticate();
    console.log('[Source] Connected.');

    console.log('[Target] Connecting to PostgreSQL...');
    await targetSequelize.authenticate();
    console.log('[Target] Connected.');

    // Initialize target models
    const TargetModels = {};
    const modelEntries = Object.entries(models).filter(([key]) => tableOrder.includes(key));

    for (const [name, sourceModel] of modelEntries) {
      // Define target model with the same attributes
      TargetModels[name] = targetSequelize.define(name, sourceModel.rawAttributes, {
        tableName: sourceModel.tableName,
        timestamps: sourceModel.options.timestamps
      });
    }

    console.log('[Target] Syncing schema...');
    await targetSequelize.sync({ force: true }); // Warning: wipes target DB
    console.log('[Target] Schema ready.');

    for (const modelName of tableOrder) {
      console.log(`[Migrate] Moving table: ${modelName}...`);
      const sourceModel = models[modelName];
      const targetModel = TargetModels[modelName];

      // Get columns actually present in SQLite for this model
      const [columns] = await sourceSequelize.query(`PRAGMA table_info("${sourceModel.tableName}")`);
      const availableCols = columns.map(c => c.name);
      
      // Filter model attributes to only those present in the physical DB
      const targetCols = Object.keys(sourceModel.rawAttributes);
      const queryCols = targetCols.filter(c => availableCols.includes(c));

      const rows = await sourceSequelize.query(
        `SELECT ${queryCols.map(c => `"${c}"`).join(', ')} FROM "${sourceModel.tableName}"`,
        { type: sourceSequelize.QueryTypes.SELECT }
      );

      if (rows.length === 0) {
        console.log(`  - Table is empty. Skipping.`);
        continue;
      }

      // Batch insert into target
      await targetModel.bulkCreate(rows, { ignoreDuplicates: true });
      console.log(`  - ✅ Migrated ${rows.length} rows using columns: ${queryCols.join(', ')}`);

      // Fix sequence for PostgreSQL (important for ID increments)
      try {
        await targetSequelize.query(`
          SELECT setval(pg_get_serial_sequence('"${sourceModel.tableName}"', 'id'), 
          COALESCE((SELECT MAX(id) FROM "${sourceModel.tableName}"), 1));
        `);
      } catch (seqErr) {
        // Some tables might not have an auto-increment ID
      }
    }

    console.log('\nMigration Complete! 🚀');
    console.log('Update your Railway environment variables:');
    console.log(`DATABASE_URL=${targetUrl}`);

  } catch (err) {
    console.error('❌ Migration failed:', err);
  } finally {
    await sourceSequelize.close();
    await targetSequelize.close();
  }
}

migrate();
