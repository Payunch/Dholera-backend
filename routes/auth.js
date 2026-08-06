const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const authController = require('../controllers/authController');

const LOGIN_WINDOW_MS = Number.parseInt(process.env.ADMIN_LOGIN_WINDOW_MS || `${15 * 60 * 1000}`, 10);
const LOGIN_MAX_ATTEMPTS = Number.parseInt(process.env.ADMIN_LOGIN_MAX_ATTEMPTS || '20', 10);

const loginLimiter = rateLimit({
  windowMs: LOGIN_WINDOW_MS,
  max: LOGIN_MAX_ATTEMPTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' }
});

router.post('/login', loginLimiter, authController.login);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);

router.get('/sessions', authController.verifyToken, authController.getSessions);
router.get('/me', authController.verifyToken, authController.getMe);
router.get('/mfa/status', authController.getMfaStatus);
router.get('/mfa/provisioning-uri', authController.verifyToken, authController.getMfaProvisioningUri);

module.exports = router;
module.exports.verifyToken = authController.verifyToken;
