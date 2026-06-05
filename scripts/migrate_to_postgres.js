/**
 * PostgreSQL Migration Utility
 * Transfers all data from SQLite to PostgreSQL.
 * 
 * Usage: 
 * 1. Set DATABASE_URL_POSTGRES in your environment.
 * 2. Run: node scripts/migrate_to_postgres.js
 */

require('dotenv').config();
const { Sequelize } = require('sequelize');
const path = require('path');
const models = require('../models');

const SQLITE_URL = `sqlite:${path.join(__dirname, '../database.sqlite')}`;
const POSTGRES_URL = process.env.DATABASE_URL_POSTGRES || process.env.DATABASE_URL;

if (!POSTGRES_URL || !POSTGRES_URL.startsWith('postgres')) {
  console.error('❌ Error: DATABASE_URL_POSTGRES is not set or is not a postgres URL.');
  process.exit(1);
}

async function migrate() {
  console.log('🚀 Starting Migration: SQLite -> PostgreSQL');
  
  // 1. Initialize Connections
  const sqlite = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, '../database.sqlite'),
    logging: false
  });

  const postgres = new Sequelize(POSTGRES_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: POSTGRES_URL.includes('localhost') ? false : {
        require: true,
        rejectUnauthorized: false
      }
    }
  });

  try {
    await sqlite.authenticate();
    console.log('✅ SQLite Connection Verified');
    
    await postgres.authenticate();
    console.log('✅ PostgreSQL Connection Verified');

    // 2. Sync PostgreSQL Schema
    console.log('📦 Syncing PostgreSQL Schema...');
    // We use the models defined in the app but bind them to the postgres instance
    for (const modelName of Object.keys(models)) {
      if (modelName === 'sequelize') continue;
      // Note: This is a simplified approach. In a production app, 
      // you would use migrations or a more robust schema sync.
    }
    
    // Use the actual models from the app
    const appModels = require('../models');
    await appModels.sequelize.sync({ force: false }); // Ensure local schema is correct
    
    // 3. Migrate Data Table by Table
    const tableOrder = [
      'Portal', 'Lead', 'Project', 'Update', 'PdfDocument', 
      'PdfView', 'PdfPurchase', 'WhatsAppLog', 'Setting', 
      'ClearanceModel', 'Translation', 'TpMap', 'Analytics'
    ];

    for (const modelName of tableOrder) {
      const Model = appModels[modelName];
      if (!Model) continue;

      console.log(`\n--- Migrating ${modelName} ---`);
      
      const records = await Model.findAll({ raw: true });
      console.log(`Found ${records.length} records in SQLite.`);

      if (records.length === 0) continue;

      // Switch connection to Postgres temporarily for this task
      // This is a bit hacky with Sequelize's singleton-like behavior 
      // but effective for a one-off script.
      
      // Better way: Use the postgres instance directly for inserts
      const PostgresModel = postgres.define(Model.name, Model.rawAttributes, Model.options);
      
      await PostgresModel.sync({ force: true }); // Wipe and recreate target table
      
      // Batch insert for performance
      const batchSize = 100;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await PostgresModel.bulkCreate(batch);
        process.stdout.write(`.`);
      }
      console.log(`\n✅ ${modelName} Migrated Successfully.`);
    }

    console.log('\n\n✨ MIGRATION COMPLETE! ✨');
    console.log('Next Steps:');
    console.log('1. Update your .env to use DB_DIALECT=postgres');
    console.log('2. Set DATABASE_URL to your PostgreSQL connection string.');
    console.log('3. Restart the server.');

  } catch (error) {
    console.error('❌ Migration Failed:', error);
  } finally {
    await sqlite.close();
    await postgres.close();
    process.exit(0);
  }
}

migrate();
