const express = require('express');
const rateLimit = require('express-rate-limit');
const controller = require('../controllers/userAuthController');
const { requestBody, signupSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema } = require('../utils/requestValidation');
const router = express.Router();

const limitConfig = (prefix, fallbackWindowMs, fallbackMax) => ({
  windowMs: Number.parseInt(process.env[`${prefix}_WINDOW_MS`] || `${fallbackWindowMs}`, 10),
  max: Number.parseInt(process.env[`${prefix}_MAX`] || `${fallbackMax}`, 10),
});

const signupLimiter = rateLimit({
  ...limitConfig('USER_SIGNUP_LIMIT', 60 * 60 * 1000, 5),
  keyGenerator: (req) => `${req.ip}:${String(req.body?.email || req.body?.phone || '').toLowerCase()}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many signup attempts. Please try again later.' },
});

const loginLimiter = rateLimit({
  ...limitConfig('USER_LOGIN_LIMIT', 15 * 60 * 1000, 10),
  keyGenerator: (req) => `${req.ip}:${String(req.body?.identifier || '').toLowerCase()}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});

const resetLimiter = rateLimit({
  ...limitConfig('USER_RESET_LIMIT', 15 * 60 * 1000, 5),
  keyGenerator: (req) => `${req.ip}:${String(req.body?.email || '').toLowerCase()}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many reset requests. Please try again later.' },
});

router.post('/signup', signupLimiter, requestBody(signupSchema), controller.signup);
router.post('/login', loginLimiter, requestBody(loginSchema), controller.login);
router.post('/forgot-password', resetLimiter, requestBody(forgotPasswordSchema), controller.requestPasswordReset);
router.post('/reset-password', resetLimiter, requestBody(resetPasswordSchema), controller.resetPassword);
router.get('/me', controller.requireUser, controller.me);
router.delete('/delete-account', controller.requireUser, controller.deleteAccount);
module.exports = router;
