const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { AppUser, PasswordResetOtp } = require('../models');
const { sendOtpEmail } = require('../services/sendOtpEmail');
const { cleanText, cleanEmail } = require('../utils/sanitize');

const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_TTL = '30d';
const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const MAX_LOGIN_ATTEMPTS = 3;
const LOGIN_BASE_LOCK_MS = Number.parseInt(process.env.USER_LOGIN_BASE_LOCK_MS || `${5 * 60 * 1000}`, 10);
const LOGIN_MAX_LOCK_MS = Number.parseInt(process.env.USER_LOGIN_MAX_LOCK_MS || `${60 * 60 * 1000}`, 10);
const normalizePhone = (value) => String(value || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
const userPayload = (user) => ({ id: user.id, name: user.name, phone: user.phone, email: user.email });
const signToken = (user) => jwt.sign({ sub: user.id, role: 'user' }, JWT_SECRET, { expiresIn: TOKEN_TTL });
const hashOtp = (code) => crypto.createHash('sha256').update(code).digest('hex');
const normalizeIp = (value) => String(value || '').replace(/^::ffff:/, '').slice(0, 64);
const readRequestMeta = (req) => ({
  ip: normalizeIp(req.headers['x-forwarded-for']?.toString().split(',')[0] || req.ip || req.socket?.remoteAddress || ''),
  userAgent: String(req.headers['user-agent'] || '').slice(0, 1000),
});
const isFourDigitPin = (value) => /^\d{4}$/.test(String(value || ''));

function configured(res) {
  if (JWT_SECRET && JWT_SECRET !== 'replace-me-too') return true;
  res.status(503).json({ error: 'User authentication is not configured on the server.' });
  return false;
}

exports.signup = async (req, res) => {
  if (!configured(res)) return;
  try {
    const name = cleanText(req.body?.name, 120);
    const email = cleanEmail(req.body?.email);
    const phone = normalizePhone(req.body?.phone);
    const password = String(req.body?.password || '');
    const acceptedTerms = req.body?.accepted_terms === true || req.body?.acceptedTerms === true;
    const acceptedPrivacy = req.body?.accepted_privacy === true || req.body?.acceptedPrivacy === true;
    if (!name || !email || !/^[6-9]\d{9}$/.test(phone) || !isFourDigitPin(password)) {
      return res.status(400).json({ error: 'Name, valid mobile, email, and a 4-digit numeric password are required.' });
    }
    if (!acceptedTerms || !acceptedPrivacy) {
      return res.status(400).json({ error: 'You must accept the Privacy Policy and Terms & Conditions before creating an account.' });
    }
    const existing = await AppUser.findOne({ where: { email } });
    if (existing) return res.status(409).json({ error: 'An account already exists for this email. Please sign in.' });
    if (await AppUser.findOne({ where: { phone } })) return res.status(409).json({ error: 'An account already exists for this mobile number.' });
    const meta = readRequestMeta(req);
    const now = new Date();
    const passwordHash = await bcrypt.hash(password, 12);

    // Keep the core insert minimal so the signup path still works even if a
    // production database is missing newer optional columns.
    const user = await AppUser.create({
      name,
      email,
      phone,
      password_hash: passwordHash,
    });

    // Best-effort metadata write; never block account creation if the live
    // schema has not yet been migrated for these optional fields.
    await user.update({
      last_login_at: now,
      last_login_ip: meta.ip,
      last_login_user_agent: meta.userAgent,
      signup_ip: meta.ip,
      signup_user_agent: meta.userAgent,
      accepted_terms_at: now,
      accepted_privacy_at: now,
    }).catch((err) => {
      console.error('[userAuth.signup] optional metadata update skipped:', err.message);
    });

    return res.status(201).json({ success: true, token: signToken(user), user: userPayload(user) });
  } catch (err) {
    console.error('[userAuth.signup]', err);
    return res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
};

exports.login = async (req, res) => {
  if (!configured(res)) return;
  const identifier = cleanText(req.body?.identifier, 255).toLowerCase();
  const user = await AppUser.findOne({ where: identifier.includes('@') ? { email: identifier } : { phone: normalizePhone(identifier) } });
  const meta = readRequestMeta(req);
  const now = new Date();
  if (!user) {
    return res.status(401).json({ error: 'Invalid email/mobile number or password.' });
  }
  if (user.locked_until && new Date(user.locked_until) > now) {
    const remainingMs = new Date(user.locked_until).getTime() - now.getTime();
    const remainingMinutes = Math.max(1, Math.ceil(remainingMs / 60000));
    return res.status(429).json({
      error: `Account is locked for ${remainingMinutes} minute(s) after too many failed attempts.`,
    });
  }
  const password = String(req.body?.password || '');
  if (!isFourDigitPin(password) || !(await bcrypt.compare(password, user.password_hash))) {
    const failedLoginAttempts = (user.failed_login_attempts || 0) + 1;
    const updates = {
      failed_login_attempts: failedLoginAttempts,
      last_failed_login_at: now,
      last_login_ip: meta.ip,
      last_login_user_agent: meta.userAgent,
    };
    if (failedLoginAttempts >= MAX_LOGIN_ATTEMPTS) {
      const lockExponent = failedLoginAttempts - MAX_LOGIN_ATTEMPTS;
      const lockMs = Math.min(LOGIN_BASE_LOCK_MS * Math.pow(2, lockExponent), LOGIN_MAX_LOCK_MS);
      updates.locked_until = new Date(now.getTime() + lockMs);
    }
    await user.update(updates);
    return res.status(401).json({ error: 'Invalid email/mobile number or password.' });
  }
  await user.update({
    last_login_at: now,
    last_login_ip: meta.ip,
    last_login_user_agent: meta.userAgent,
    failed_login_attempts: 0,
    locked_until: null,
    last_failed_login_at: null,
  });
  return res.json({ success: true, token: signToken(user), user: userPayload(user) });
};

exports.me = async (req, res) => res.json({ success: true, user: userPayload(req.appUser) });

exports.deleteAccount = async (req, res) => {
  try {
    const user = req.appUser;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    await PasswordResetOtp.destroy({ where: { user_id: user.id } });
    await user.destroy();

    return res.json({ success: true, message: 'Account deleted successfully.' });
  } catch (err) {
    console.error('[userAuth.deleteAccount]', err);
    return res.status(500).json({ error: 'Failed to delete account. Please try again later.' });
  }
};

exports.requestPasswordReset = async (req, res) => {
  const email = cleanEmail(req.body?.email);
  const user = email ? await AppUser.findOne({ where: { email } }) : null;
  // Do not reveal whether an email has an account.
  if (!user) return res.json({ success: true, message: 'If that email has an account, a code has been sent.' });
  const code = crypto.randomInt(100000, 1000000).toString();
  await PasswordResetOtp.upsert({ user_id: user.id, code_hash: hashOtp(code), expires_at: new Date(Date.now() + OTP_TTL_MS), attempts: 0 });
  const result = await sendOtpEmail(user.email, user.name, code);
  if (!result.success) return res.status(503).json({ error: 'Unable to send verification email. Please try again later.' });
  return res.json({ success: true, message: 'If that email has an account, a code has been sent.' });
};

exports.resetPassword = async (req, res) => {
  const email = cleanEmail(req.body?.email);
  const code = String(req.body?.otp || '');
  const password = String(req.body?.password || '');
  const user = email ? await AppUser.findOne({ where: { email } }) : null;
  const otp = user ? await PasswordResetOtp.findOne({ where: { user_id: user.id } }) : null;
  if (!user || !otp || otp.expires_at <= new Date() || otp.attempts >= MAX_OTP_ATTEMPTS || !/^\d{6}$/.test(code) || hashOtp(code) !== otp.code_hash) {
    if (otp) await otp.increment('attempts');
    return res.status(400).json({ error: 'Invalid or expired verification code.' });
  }
  if (!isFourDigitPin(password)) return res.status(400).json({ error: 'Password must be exactly 4 digits.' });
  await user.update({ password_hash: await bcrypt.hash(password, 12), last_login_at: new Date() });
  await otp.destroy();
  return res.json({ success: true, token: signToken(user), user: userPayload(user) });
};

exports.requireUser = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    const payload = token && jwt.verify(token, JWT_SECRET);
    if (!payload || payload.role !== 'user') throw new Error('Unauthorized');
    const user = await AppUser.findByPk(payload.sub);
    if (!user) throw new Error('Unauthorized');
    req.appUser = user;
    next();
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[userAuth.requireUser]', err);
    }
    res.status(401).json({ error: 'Your session has expired. Please sign in again.' });
  }
};
