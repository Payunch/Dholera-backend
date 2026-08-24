const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');

const LOGIN_WINDOW_MS = Number.parseInt(process.env.ADMIN_LOGIN_WINDOW_MS || `${15 * 60 * 1000}`, 10);
const LOGIN_MAX_ATTEMPTS = Number.parseInt(process.env.ADMIN_LOGIN_MAX_ATTEMPTS || '20', 10);

const loginLimiter = rateLimit({
  windowMs: LOGIN_WINDOW_MS,
  max: LOGIN_MAX_ATTEMPTS,
  keyGenerator: (req) => `${req.ip}:${String(req.body?.username || '').toLowerCase()}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' }
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50,
  keyGenerator: (req) => `${req.ip}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many refresh attempts. Please try again later.' }
});

router.post('/login', loginLimiter, authController.login);
router.post('/mobile-login', loginLimiter, authController.mobileLogin);
router.post('/refresh-token', refreshLimiter, authController.refreshToken);
router.post('/mobile-refresh', refreshLimiter, authController.mobileRefresh);
router.post('/mobile-logout', refreshLimiter, authController.mobileLogout);
router.post('/logout', authController.logout);

router.get('/sessions', authController.verifyToken, authController.getSessions);
router.get('/me', authController.verifyToken, authController.getMe);
router.get('/mfa/status', authController.getMfaStatus);
router.get('/mfa/provisioning-uri', authController.verifyToken, authController.getMfaProvisioningUri);

module.exports = router;
module.exports.verifyToken = authController.verifyToken;
