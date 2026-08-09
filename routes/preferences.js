const express = require('express');
const router = express.Router();
const { Lead, Translation } = require('../models');
const { cleanText } = require('../utils/sanitize');

// GET all translations for a specific language
router.get('/translations/:lang', async (req, res) => {
  try {
    const { lang } = req.params;
    const translations = await Translation.findAll({ where: { lang } });
    
    const dict = {};
    translations.forEach(t => {
      dict[t.key] = t.value;
    });
    
    res.json(dict);
  } catch (err) {
    res.status(500).json({ error: 'Unable to complete this action right now.' });
  }
});

const extractToken = (req) => {
  // 1. Try x-lead-token header
  const xLeadToken = req.headers['x-lead-token'];
  if (xLeadToken) return xLeadToken.trim();

  // 2. Try Authorization header
  const authHeader = req.headers['authorization'] || '';
  if (authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.substring(7).trim();
    if (token) return token;
  }
  
  const directAuth = authHeader.trim();
  if (directAuth && !directAuth.toLowerCase().startsWith('bearer ')) {
    return directAuth;
  }

  // 3. Try lead_token cookie (fallback for withCredentials requests)
  if (req.cookies && req.cookies['lead_token']) {
    return req.cookies['lead_token'].trim();
  }

  return '';
};

// GET user preferences
router.get('/user', async (req, res) => {
  try {
    const token = extractToken(req);
    if (!token) return res.status(400).json({ 
      error: 'Token required', 
      details: 'Missing Authorization header, x-lead-token, or lead_token cookie' 
    });

    const lead = await Lead.findOne({ where: { lead_token: token } });
    if (!lead) return res.status(404).json({ error: 'User not found' });

    res.json({
      language: lead.preferred_language,
      theme: lead.preferred_theme,
      name: lead.name
    });
  } catch (err) {
    res.status(500).json({ error: 'Unable to complete this action right now.' });
  }
});

// POST update user preferences
router.post('/user', async (req, res) => {
  try {
    const token = extractToken(req);
    const { language, theme } = req.body;

    if (!token) return res.status(400).json({ 
      error: 'Token required', 
      details: 'Missing Authorization header, x-lead-token, or lead_token cookie' 
    });

    const lead = await Lead.findOne({ where: { lead_token: token } });
    if (!lead) return res.status(404).json({ error: 'User not found' });

    if (language) lead.preferred_language = cleanText(language, 10);
    if (theme) lead.preferred_theme = cleanText(theme, 20);

    await lead.save();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Unable to complete this action right now.' });
  }
});

// POST register FCM token
router.post('/fcm-token', async (req, res) => {
  try {
    const token = extractToken(req);
    const { fcmToken } = req.body;

    if (!token) return res.status(400).json({ 
      error: 'Token required', 
      details: 'Missing Authorization header, x-lead-token, or lead_token cookie' 
    });
    if (!fcmToken) return res.status(400).json({ error: 'FCM Token required' });

    const lead = await Lead.findOne({ where: { lead_token: token } });
    if (!lead) return res.status(404).json({ error: 'User not found' });

    lead.fcm_token = fcmToken;
    await lead.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Unable to complete this action right now.' });
  }
});

// POST seed translations (Admin or one-time)
router.post('/translations/seed', async (req, res) => {
  try {
    const { translations, lang } = req.body; // { key: value }
    
    for (const [key, value] of Object.entries(translations)) {
      await Translation.upsert({ key, lang, value });
    }
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Unable to complete this action right now.' });
  }
});

module.exports = router;

