const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const memoryUpload = multer({ storage: multer.memoryStorage() });
const {
  requestBody,
  onboardLeadSchema,
  verifyOtpSchema,
  trackReturningSchema,
  updateProfileSchema,
  createLeadSchema,
} = require('../utils/requestValidation');

const { verifyToken } = require('./auth');
const leadsController = require('../controllers/leadsController');

const limitConfig = (prefix, fallbackWindowMs, fallbackMax) => ({
  windowMs: Number.parseInt(process.env[`${prefix}_WINDOW_MS`] || `${fallbackWindowMs}`, 10),
  max: Number.parseInt(process.env[`${prefix}_MAX`] || `${fallbackMax}`, 10),
});

const otpLimiter = rateLimit({
  ...limitConfig('LEAD_OTP_LIMIT', 15 * 60 * 1000, 5),
  message: { error: 'Too many OTP requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const formLimiter = rateLimit({
  ...limitConfig('LEAD_FORM_LIMIT', 60 * 60 * 1000, 15),
  message: { error: 'Too many form submissions from this IP, please try again after an hour' },
  standardHeaders: true,
  legacyHeaders: false,
});

const onboardRateLimiter = rateLimit({
  ...limitConfig('LEAD_ONBOARD_LIMIT', 60 * 60 * 1000, 20),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many onboarding attempts from this IP, please try again later.' }
});

router.get('/', verifyToken, leadsController.getLeads);
router.get('/check-visitor/:fingerprint', leadsController.checkVisitor);
router.post('/onboard', onboardRateLimiter, requestBody(onboardLeadSchema), leadsController.onboardLead);
router.post('/verify-otp', otpLimiter, requestBody(verifyOtpSchema), leadsController.verifyOtp);
router.post('/save-direct', requestBody(onboardLeadSchema), leadsController.saveDirect);
router.post('/track-returning', requestBody(trackReturningSchema), leadsController.trackReturning);
router.get('/verify-token', leadsController.verifyLeadToken);
router.patch('/profile', requestBody(updateProfileSchema), leadsController.updateProfile);
router.get('/export', verifyToken, leadsController.exportLeads);
router.post('/', formLimiter, requestBody(createLeadSchema), leadsController.createLead);
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
