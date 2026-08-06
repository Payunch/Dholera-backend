const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const memoryUpload = multer({ storage: multer.memoryStorage() });

const { verifyToken } = require('./auth');
const leadsController = require('../controllers/leadsController');

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many OTP requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 15,
  message: { error: 'Too many form submissions from this IP, please try again after an hour' },
  standardHeaders: true,
  legacyHeaders: false,
});

const onboardRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many onboarding attempts from this IP, please try again later.' }
});

router.get('/', verifyToken, leadsController.getLeads);
router.get('/check-visitor/:fingerprint', leadsController.checkVisitor);
router.post('/onboard', onboardRateLimiter, leadsController.onboardLead);
router.post('/verify-otp', otpLimiter, leadsController.verifyOtp);
router.post('/save-direct', leadsController.saveDirect);
router.post('/track-returning', leadsController.trackReturning);
router.get('/verify-token', leadsController.verifyLeadToken);
router.patch('/profile', leadsController.updateProfile);
router.get('/export', verifyToken, leadsController.exportLeads);
router.post('/', formLimiter, leadsController.createLead);
router.put('/:id/status', verifyToken, leadsController.updateStatus);
router.put('/:id/notes', verifyToken, leadsController.updateNotes);
router.get('/:id/whatsapp-url', verifyToken, leadsController.getWhatsappUrl);
router.post('/:id/whatsapp-log', verifyToken, leadsController.logWhatsapp);
router.post('/import', verifyToken, memoryUpload.single('file'), leadsController.importLeads);
router.put('/:id/read', verifyToken, leadsController.markRead);
router.get('/system/backup', verifyToken, leadsController.systemBackup);
router.post('/system/restore', verifyToken, memoryUpload.single('file'), leadsController.systemRestore);
router.post('/webhook/google-ads', leadsController.googleAdsWebhook);
router.delete('/:id', verifyToken, leadsController.deleteLead);

module.exports = router;
