const fs = require('fs');

const file = 'controllers/leadsController.js';
let content = fs.readFileSync(file, 'utf8');

// Replace router setup
content = content.replace("const express = require('express');\nconst router = express.Router();", "");

// Create a mapping of original router definitions to export definitions
const replacements = [
  { match: /router\.get\('\/', verifyToken, async \(req, res\) => \{/, replace: 'exports.getLeads = async (req, res) => {' },
  { match: /router\.get\('\/check-visitor\/:fingerprint', async \(req, res\) => \{/, replace: 'exports.checkVisitor = async (req, res) => {' },
  { match: /router\.post\('\/onboard', onboardRateLimiter, async \(req, res\) => \{/, replace: 'exports.onboardLead = async (req, res) => {' },
  { match: /router\.post\('\/verify-otp', otpLimiter, async \(req, res\) => \{/, replace: 'exports.verifyOtp = async (req, res) => {' },
  { match: /router\.post\('\/save-direct', async \(req, res\) => \{/, replace: 'exports.saveDirect = async (req, res) => {' },
  { match: /router\.post\('\/track-returning', async \(req, res\) => \{/, replace: 'exports.trackReturning = async (req, res) => {' },
  { match: /router\.get\('\/verify-token', async \(req, res\) => \{/, replace: 'exports.verifyLeadToken = async (req, res) => {' },
  { match: /router\.patch\('\/profile', async \(req, res\) => \{/, replace: 'exports.updateProfile = async (req, res) => {' },
  { match: /router\.get\('\/export', verifyToken, async \(req, res\) => \{/, replace: 'exports.exportLeads = async (req, res) => {' },
  { match: /router\.post\('\/', formLimiter, async \(req, res\) => \{/, replace: 'exports.createLead = async (req, res) => {' },
  { match: /router\.put\('\/:id\/status', verifyToken, async \(req, res\) => \{/, replace: 'exports.updateStatus = async (req, res) => {' },
  { match: /router\.put\('\/:id\/notes', verifyToken, async \(req, res\) => \{/, replace: 'exports.updateNotes = async (req, res) => {' },
  { match: /router\.get\('\/:id\/whatsapp-url', verifyToken, async \(req, res\) => \{/, replace: 'exports.getWhatsappUrl = async (req, res) => {' },
  { match: /router\.post\('\/:id\/whatsapp-log', verifyToken, async \(req, res\) => \{/, replace: 'exports.logWhatsapp = async (req, res) => {' },
  { match: /router\.post\('\/import', verifyToken, memoryUpload\.single\('file'\), async \(req, res\) => \{/, replace: 'exports.importLeads = async (req, res) => {' },
  { match: /router\.put\('\/:id\/read', verifyToken, async \(req, res\) => \{/, replace: 'exports.markRead = async (req, res) => {' },
  { match: /router\.get\('\/system\/backup', verifyToken, async \(req, res\) => \{/, replace: 'exports.systemBackup = async (req, res) => {' },
  { match: /router\.post\('\/system\/restore', verifyToken, memoryUpload\.single\('file'\), async \(req, res\) => \{/, replace: 'exports.systemRestore = async (req, res) => {' },
  { match: /router\.post\('\/webhook\/google-ads', async \(req, res\) => \{/, replace: 'exports.googleAdsWebhook = async (req, res) => {' },
  { match: /router\.delete\('\/:id', verifyToken, async \(req, res\) => \{/, replace: 'exports.deleteLead = async (req, res) => {' },
  { match: /module\.exports = router;/, replace: '' }
];

replacements.forEach(r => {
  content = content.replace(r.match, r.replace);
});

fs.writeFileSync(file, content, 'utf8');
console.log('Controller generated successfully');
