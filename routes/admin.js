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
      // For SQLite, temporarily disable foreign key checks
      const dialect = sequelize.getDialect && sequelize.getDialect();
      if (dialect === 'sqlite') {
        await sequelize.query('PRAGMA foreign_keys = OFF', { transaction: t });
      }

      // Simple restore strategy: delete existing rows then bulk insert in safe-ish order
      const insertOrder = [
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
        'Setting',
        'UserSession'
      ];

      for (const key of insertOrder) {
        if (!models[key]) continue;
        const items = Array.isArray(data[key]) ? data[key] : [];
        // Remove existing rows
        await models[key].destroy({ where: {}, truncate: true, transaction: t });
        if (items.length > 0) {
          // Preserve timestamps from the backup file
          await models[key].bulkCreate(items, { 
            transaction: t,
            validate: false,
            hooks: false,
            individualHooks: false
          });
        }
        resultCounts[key] = items.length;
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

module.exports = router;
