const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer();
const { sequelize } = require('../models');
const models = require('../models');
const { verifyToken } = require('./auth');

// List of model keys to include in backup/restore
const MODEL_KEYS = [
  'Lead',
  'Update',
  'Analytics',
  'VisitorSession',
  'PdfDocument',
  'PdfView',
  'PdfPurchase',
  'AuditLog',
  'WhatsAppLog',
  'Setting',
  'UserSession',
  'ClearanceModel'
];

// GET /api/admin/backup
router.get('/backup', verifyToken, async (req, res) => {
  try {
    const payload = { exportedAt: new Date().toISOString(), data: {} };
    await Promise.all(MODEL_KEYS.map(async (k) => {
      if (!models[k]) return;
      const rows = await models[k].findAll({ raw: true });
      payload.data[k] = rows;
    }));

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="dholera-backup-${new Date().toISOString()}.json"`);
    return res.send(JSON.stringify(payload));
  } catch (err) {
    console.error('Backup error:', err);
    return res.status(500).json({ error: 'Failed to generate backup' });
  }
});

// POST /api/admin/restore - accepts multipart/form-data with file field 'backup'
router.post('/restore', verifyToken, upload.single('backup'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Missing backup file' });

    let payload;
    try {
      payload = JSON.parse(req.file.buffer.toString('utf8'));
    } catch (parseErr) {
      return res.status(400).json({ error: 'Invalid JSON backup file' });
    }

    const data = payload.data || {};

    const resultCounts = {};

    await sequelize.transaction(async (t) => {
      const dialect = sequelize.getDialect();
      
      // 1. CLEAR PHASE: Delete in reverse dependency order to respect foreign keys
      const deleteOrder = [
        'UserSession',
        'ClearanceModel',
        'PdfPurchase',
        'PdfView',
        'WhatsAppLog',
        'AuditLog',
        'VisitorSession',
        'Analytics',
        'Update',
        'PdfDocument',
        'Lead',
        'Setting'
      ];

      for (const key of deleteOrder) {
        if (!models[key]) continue;
        if (dialect === 'postgres') {
          // PostgreSQL requires CASCADE if there are any lingering references
          await sequelize.query(`TRUNCATE TABLE "${models[key].tableName}" RESTART IDENTITY CASCADE`, { transaction: t });
        } else if (dialect === 'sqlite') {
          await sequelize.query('PRAGMA foreign_keys = OFF', { transaction: t });
          await models[key].destroy({ where: {}, truncate: true, transaction: t });
        } else {
          await models[key].destroy({ where: {}, force: true, transaction: t });
        }
      }

      // 2. INSERT PHASE: Insert in forward dependency order
      const insertOrder = [
        'Setting',
        'Lead',
        'PdfDocument',
        'Update',
        'Analytics',
        'VisitorSession',
        'AuditLog',
        'WhatsAppLog',
        'PdfView',
        'PdfPurchase',
        'ClearanceModel',
        'UserSession'
      ];

      for (const key of insertOrder) {
        if (!models[key]) continue;
        // Support both { data: { Lead: [] } } and { leads: [] } formats
        const items = data[key] || data[key.toLowerCase()] || data[key.toLowerCase() + 's'] || [];
        
        if (Array.isArray(items) && items.length > 0) {
          await models[key].bulkCreate(items, { 
            transaction: t,
            validate: false,
            hooks: false,
            individualHooks: false
          });
        }
        resultCounts[key] = Array.isArray(items) ? items.length : 0;
      }

      if (dialect === 'sqlite') {
        await sequelize.query('PRAGMA foreign_keys = ON', { transaction: t });
      }
    });

    return res.json({ ok: true, restoredAt: new Date().toISOString(), counts: resultCounts });
  } catch (err) {
    console.error('Restore error:', err);
    return res.status(500).json({ error: 'Restore failed', details: err.message });
  }
});

/**
 * GET /api/admin/db/tables
 * Lists all tables in the database.
 */
router.get('/db/tables', verifyToken, async (req, res) => {
  try {
    const tables = await sequelize.getQueryInterface().showAllTables();
    // Exclude internal/system tables if any
    const filtered = tables.filter(t => !['sqlite_sequence', 'SequelizeMeta'].includes(t));
    res.json(filtered);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/admin/db/raw/:tableName
 * Fetches all rows from a specific table.
 */
router.get('/db/raw/:tableName', verifyToken, async (req, res) => {
  try {
    const { tableName } = req.params;
    
    // Safety check: ensure tableName is alphanumeric to prevent injection
    if (!/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return res.status(400).json({ error: 'Invalid table name' });
    }

    // Direct query for total visibility
    const dialect = sequelize.getDialect();
    let query = `SELECT * FROM "${tableName}" LIMIT 1000`;
    
    try {
      let hasCreatedAt = false;
      if (dialect === 'sqlite') {
        const [results] = await sequelize.query(`SELECT name FROM pragma_table_info('${tableName}') WHERE name = 'createdAt'`);
        hasCreatedAt = results.length > 0;
      } else if (dialect === 'postgres') {
        const [results] = await sequelize.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = '${tableName}' AND column_name = 'createdAt'
        `);
        hasCreatedAt = results.length > 0;
      }

      if (hasCreatedAt) {
        query = `SELECT * FROM "${tableName}" ORDER BY "createdAt" DESC LIMIT 1000`;
      }
    } catch(e) {
      console.warn(`[Admin] Failed to check for createdAt in ${tableName}:`, e.message);
    }

    const data = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });
    
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/admin/leads/purge
router.delete('/leads/purge', verifyToken, async (req, res) => {
  try {
    const { Lead, PdfPurchase, PdfView, WhatsAppLog, VisitorSession, AuditLog } = require('../models');
    
    // Clear dependencies first to avoid FK errors
    if (PdfPurchase) await PdfPurchase.destroy({ where: {} });
    if (PdfView) await PdfView.destroy({ where: {} });
    if (WhatsAppLog) await WhatsAppLog.destroy({ where: {} });
    if (VisitorSession) await VisitorSession.destroy({ where: {} });
    if (AuditLog) await AuditLog.destroy({ where: {} });
    
    // Finally clear leads
    const count = await Lead.destroy({ where: {} });
    
    res.json({ success: true, count, message: `Successfully wiped ${count} leads and all associated test data.` });
  } catch (err) {
    console.error('Failed to purge leads:', err);
    res.status(500).json({ error: 'Failed to purge leads data: ' + err.message });
  }
});

module.exports = router;
