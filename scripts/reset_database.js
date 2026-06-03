const { 
  sequelize, 
  Lead, 
  Update, 
  Analytics, 
  PdfDocument, 
  PdfView, 
  PdfPurchase, 
  WhatsAppLog, 
  ClearanceModel 
} = require('../models');

async function resetDatabase() {
  console.log('--- DHOLERA_DB Maintenance: Data Cleanup ---');
  
  const tablesToClear = [
    { name: 'Leads', model: Lead },
    { name: 'Updates', model: Update },
    { name: 'Analytics', model: Analytics },
    { name: 'PdfDocuments', model: PdfDocument },
    { name: 'PdfViews', model: PdfView },
    { name: 'PdfPurchases', model: PdfPurchase },
    { name: 'WhatsAppLogs', model: WhatsAppLog },
    { name: 'ClearanceModels', model: ClearanceModel }
  ];

  // Additional raw tables mentioned by user
  const rawTables = [
    'UserSessions',
    'UserSessions_Store',
    'VisitorSessions',
    'AuditLogs'
  ];

  try {
    // 1. Clear Model-based tables
    for (const { name, model } of tablesToClear) {
      if (model) {
        console.log(`Clearing table: ${name}...`);
        try {
          await model.destroy({ where: {}, truncate: true, cascade: true });
          console.log(`✅ ${name} cleared.`);
        } catch (err) {
          // Fallback if truncate/cascade fails (e.g. SQLite doesn't support cascade)
          await model.destroy({ where: {} });
          console.log(`✅ ${name} cleared (fallback delete).`);
        }
      } else {
        console.warn(`⚠️ Model for ${name} not found, skipping.`);
      }
    }

    // 2. Clear Raw tables
    for (const tableName of rawTables) {
      console.log(`Clearing raw table: ${tableName}...`);
      try {
        await sequelize.query(`DELETE FROM "${tableName}"`);
        console.log(`✅ Raw table ${tableName} cleared.`);
      } catch (err) {
        // Table might not exist
        if (err.message.includes('does not exist') || err.message.includes('no such table')) {
          console.log(`ℹ️ Table ${tableName} does not exist, skipping.`);
        } else {
          console.error(`❌ Error clearing ${tableName}:`, err.message);
        }
      }
    }

    console.log('\n--- Maintenance Complete ---');
    console.log('NOTE: Settings table was preserved as requested.');
    
  } catch (err) {
    console.error('CRITICAL ERROR DURING CLEANUP:', err);
  } finally {
    await sequelize.close();
    process.exit(0);
  }
}

resetDatabase();
