/**
 * Dholera Platform - Supabase Migration Script
 * Usage: NODE_ENV=production node scripts/migrate-to-supabase.js
 */
const { 
  Lead, 
  PdfPurchase, 
  PdfDocument, 
  PdfView, 
  Update, 
  Setting, 
  WhatsAppLog,
  sequelize 
} = require('../models');

async function migrate() {
  console.log('🚀 Starting Supabase Migration...');
  
  try {
    // 1. Authenticate with current SQLite
    await sequelize.authenticate();
    console.log('✅ SQLite Connection Established.');

    // 2. Extract Data
    console.log('📦 Extracting data from SQLite...');
    const leads = await Lead.findAll();
    const purchases = await PdfPurchase.findAll();
    const docs = await PdfDocument.findAll();
    const views = await PdfView.findAll();
    const updates = await Update.findAll();
    const settings = await Setting.findAll();
    const logs = await WhatsAppLog.findAll();

    console.log(`📊 Statistics:
      Leads: ${leads.length}
      Purchases: ${purchases.length}
      Documents: ${docs.length}
      Views: ${views.length}
      Updates: ${updates.length}
      Settings: ${settings.length}
      WhatsApp Logs: ${logs.length}
    `);

    console.log('\n⚠️  INSTRUCTIONS:');
    console.log('1. Go to Supabase -> Project Settings -> Database.');
    console.log('2. Set DATABASE_URL in your .env file to the connection string.');
    console.log('3. Set DB_DIALECT=postgres in your .env file.');
    console.log('4. Restart the server. The models will auto-sync to PostgreSQL.');
    console.log('5. Re-run this script to push data into the new database.');

  } catch (err) {
    console.error('❌ Migration Error:', err);
  }
}

migrate();
