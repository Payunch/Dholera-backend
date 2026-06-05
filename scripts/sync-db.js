/**
 * Production Database Sync Utility
 * Ensures the database schema matches the Sequelize models.
 * Safe for both SQLite and PostgreSQL.
 */

require('dotenv').config();
const { sequelize } = require('../models');

async function syncDatabase() {
  const dbConfig = sequelize.options;
  console.log(`🚀 Starting Database Sync...`);
  console.log(`📡 Dialect: ${dbConfig.dialect}`);
  
  if (dbConfig.dialect === 'postgres') {
    console.log(`🌐 Target: PostgreSQL (Remote)`);
  } else {
    console.log(`📁 Target: SQLite (Local: ${dbConfig.storage})`);
  }

  try {
    // In production, we typically don't want { force: true } as it drops tables.
    // { alter: true } will try to update columns without dropping data.
    const isProduction = process.env.NODE_ENV === 'production';
    
    await sequelize.sync({ 
      alter: !isProduction, // Only auto-alter in dev/staging for safety
      force: false 
    });

    console.log('✅ Database synchronized successfully.');
    
    if (isProduction) {
      console.log('📝 Note: Production sync performed without "alter". Use migrations for schema changes.');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Database Sync Failed:');
    console.error(error);
    process.exit(1);
  }
}

syncDatabase();
