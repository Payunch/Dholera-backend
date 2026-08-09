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
const normalizePhone = (value) => String(value || '').replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
const userPayload = (user) => ({ id: user.id, name: user.name, phone: user.phone, email: user.email });
const signToken = (user) => jwt.sign({ sub: user.id, role: 'user' }, JWT_SECRET, { expiresIn: TOKEN_TTL });
const hashOtp = (code) => crypto.createHash('sha256').update(code).digest('hex');

function configured(res) {
  if (JWT_SECRET && JWT_SECRET !== 'replace-me-too') return true;
  res.status(503).json({ error: 'User authentication is not configured on the server.' });
  return false;
}

exports.signup = async (req, res) => {
  if (!configured(res)) return;
  const name = cleanText(req.body?.name, 120);
  const email = cleanEmail(req.body?.email);
  const phone = normalizePhone(req.body?.phone);
  const password = String(req.body?.password || '');
  if (!name || !email || !/^[6-9]\d{9}$/.test(phone) || password.length < 8) {
    return res.status(400).json({ error: 'Name, valid mobile, email, and an 8-character password are required.' });
  }
  const existing = await AppUser.findOne({ where: { email } });
  if (existing) return res.status(409).json({ error: 'An account already exists for this email. Please sign in.' });
  if (await AppUser.findOne({ where: { phone } })) return res.status(409).json({ error: 'An account already exists for this mobile number.' });
  const user = await AppUser.create({ name, email, phone, password_hash: await bcrypt.hash(password, 12), last_login_at: new Date() });
  return res.status(201).json({ success: true, token: signToken(user), user: userPayload(user) });
};

exports.login = async (req, res) => {
  if (!configured(res)) return;
  const identifier = cleanText(req.body?.identifier, 255).toLowerCase();
  const user = await AppUser.findOne({ where: identifier.includes('@') ? { email: identifier } : { phone: normalizePhone(identifier) } });
  if (!user || !(await bcrypt.compare(String(req.body?.password || ''), user.password_hash))) {
    return res.status(401).json({ error: 'Invalid email/mobile number or password.' });
  }
  await user.update({ last_login_at: new Date() });
  return res.json({ success: true, token: signToken(user), user: userPayload(user) });
};

exports.me = async (req, res) => res.json({ success: true, user: userPayload(req.appUser) });

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
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
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
  } catch (_) { res.status(401).json({ error: 'Your session has expired. Please sign in again.' }); }
};
