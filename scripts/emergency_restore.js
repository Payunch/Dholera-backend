/**
 * emergency_restore.js
 * 
 * Restores the dholera-platform-backup-2026-06-02 (1).json file directly into PostgreSQL.
 */

const fs = require('fs');
const path = require('path');
const { Lead, PdfDocument, PdfPurchase, PdfView, Update, VisitorSession, AuditLog, UserSession, sequelize } = require('../models');

async function restore() {
  const filePath = path.join(__dirname, '..', '..', 'dholera-platform-backup-2026-06-02 (1).json');
  if (!fs.existsSync(filePath)) {
    console.error('Backup file not found:', filePath);
    return;
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const root = JSON.parse(raw);
  const data = root.data || root;

  try {
    await sequelize.authenticate();
    console.log('[DB] Connected to PostgreSQL.');

    await sequelize.transaction(async (t) => {
      // 1. Restore Leads
      const leads = data.Lead || data.leads || [];
      console.log(`Restoring ${leads.length} leads...`);
      for (const item of leads) {
        await Lead.findOrCreate({ where: { phone: item.phone }, defaults: item, transaction: t });
      }

      // 2. Restore PDFs (Merge with Cloudinary Sync)
      const pdfs = data.PdfDocument || data.pdfs || [];
      console.log(`Restoring ${pdfs.length} PDFs...`);
      for (const item of pdfs) {
        await PdfDocument.findOrCreate({ where: { title: item.title }, defaults: item, transaction: t });
      }

      // 3. Restore Purchases (CRITICAL)
      const purchases = data.PdfPurchase || data.purchases || [];
      console.log(`Restoring ${purchases.length} purchases...`);
      for (const item of purchases) {
        // We match by transaction_id
        await PdfPurchase.findOrCreate({ 
          where: { transaction_id: item.transaction_id }, 
          defaults: item, 
          transaction: t 
        });
      }

      // 4. Restore Updates
      const updates = data.Update || data.updates || [];
      console.log(`Restoring ${updates.length} updates...`);
      for (const item of updates) {
        await Update.findOrCreate({ where: { title: item.title }, defaults: item, transaction: t });
      }
    });

    console.log('Emergency Restore Complete! 🚀');

  } catch (err) {
    console.error('Restore failed:', err);
  } finally {
    await sequelize.close();
  }
}

restore();
