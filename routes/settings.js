const express = require('express');
const router = express.Router();
const { Setting } = require('../models');
const { verifyToken } = require('./auth');
const { logAuditEvent } = require('../services/auditLogger');
const { cleanText } = require('../utils/sanitize');

const parseInteger = (value, fallback) => {
  const parsed = Number.parseInt(String(value ?? '').trim(), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

// Public app release info for APK distribution and forced-update checks.
router.get('/app-info', async (req, res) => {
  try {
    const settings = await Setting.findAll({
      where: { category: 'app_release' }
    });

    const config = {
      apkUrl: process.env.APP_APK_URL || '',
      requiredBuildNumber: parseInteger(process.env.APP_REQUIRED_BUILD_NUMBER, 2),
      latestBuildNumber: parseInteger(process.env.APP_LATEST_BUILD_NUMBER, 2),
      releaseNotes: process.env.APP_RELEASE_NOTES || '',
      updateTitle: process.env.APP_UPDATE_TITLE || 'Update Required',
      updateMessage: process.env.APP_UPDATE_MESSAGE || 'A newer APK is available. Please update to continue.',
      forceUpdate: String(process.env.APP_FORCE_UPDATE || 'true') === 'true'
    };

    for (const setting of settings) {
      if (setting.key === 'apkUrl') config.apkUrl = setting.value || config.apkUrl;
      if (setting.key === 'requiredBuildNumber') config.requiredBuildNumber = parseInteger(setting.value, config.requiredBuildNumber);
      if (setting.key === 'latestBuildNumber') config.latestBuildNumber = parseInteger(setting.value, config.latestBuildNumber);
      if (setting.key === 'releaseNotes') config.releaseNotes = setting.value || config.releaseNotes;
      if (setting.key === 'updateTitle') config.updateTitle = setting.value || config.updateTitle;
      if (setting.key === 'updateMessage') config.updateMessage = setting.value || config.updateMessage;
      if (setting.key === 'forceUpdate') config.forceUpdate = String(setting.value).toLowerCase() === 'true';
    }

    return res.json({
      success: true,
      ...config
    });
  } catch (err) {
    console.error('[settings.getAppInfo]', err);
    return res.status(500).json({ error: 'Unable to load app info right now.' });
  }
});

// GET all business settings
router.get('/', verifyToken, async (req, res) => {
  try {
    const settings = await Setting.findAll({
      where: { category: 'business_details' }
    });
    
    // Convert array to object for easier frontend use
    const config = {};
    settings.forEach(s => {
      config[s.key] = s.value;
    });
    
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: 'Unable to complete this action right now.' });
  }
});

// POST update settings
router.post('/', verifyToken, async (req, res) => {
  try {
    const updates = req.body; // { key: value, ... }
    
    for (const [key, value] of Object.entries(updates)) {
      const cleanValue = cleanText(String(value), 500);
      
      const [setting, created] = await Setting.findOrCreate({
        where: { key },
        defaults: { value: cleanValue, category: 'business_details' }
      });
      
      if (!created) {
        await setting.update({ value: cleanValue });
      }
    }

    await logAuditEvent({
      eventType: 'settings.updated',
      actorType: 'admin',
      actorId: req.user?.role || 'admin',
      success: true,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: { keys: Object.keys(updates) }
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Unable to complete this action right now.' });
  }
});

module.exports = router;

