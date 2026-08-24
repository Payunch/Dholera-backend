const crypto = require('crypto');
const { logAuditEvent } = require('../services/auditLogger');
const { cleanText } = require('../utils/sanitize');
const { UserSession } = require('../models');
const {
  isMfaEnabled,
  verifyMfaCode,
  issueAdminTokens,
  rotateRefreshToken,
  revokeRefreshToken,
  setAuthCookies,
  clearAuthCookies,
  getTokenFromRequest,
  verifyAccessToken,
  getMfaProvisioningUri
} = require('../services/adminSecurity');

const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASS = process.env.ADMIN_PASS;
const JWT_SECRET = process.env.JWT_SECRET;
const LOGIN_LOCKOUT_BASE_MS = Number.parseInt(process.env.ADMIN_LOCKOUT_BASE_MS || `${5 * 60 * 1000}`, 10);
const LOGIN_LOCKOUT_MAX_MS = Number.parseInt(process.env.ADMIN_LOCKOUT_MAX_MS || `${60 * 60 * 1000}`, 10);
const LOGIN_LOCKOUT_THRESHOLD = Number.parseInt(process.env.ADMIN_LOCKOUT_THRESHOLD || '10', 10);
const failedLoginState = new Map();

const safeEqual = (a, b) => {
  const aBuffer = Buffer.from(a || '', 'utf8');
  const bBuffer = Buffer.from(b || '', 'utf8');
  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
};

const getLockoutKey = (username, ip) => `${String(username || '').toLowerCase()}:${ip || 'unknown'}`;

const registerLoginFailure = (key) => {
  const now = Date.now();
  const current = failedLoginState.get(key) || { count: 0, lockUntil: 0 };
  const count = current.count + 1;
  const lockUntil = count >= LOGIN_LOCKOUT_THRESHOLD
    ? now + Math.min(
        LOGIN_LOCKOUT_BASE_MS * Math.pow(2, count - LOGIN_LOCKOUT_THRESHOLD),
        LOGIN_LOCKOUT_MAX_MS
      )
    : 0;
  failedLoginState.set(key, { count, lockUntil });
  return { count, lockUntil };
};

const clearLoginFailure = (key) => {
  failedLoginState.delete(key);
};

exports.login = async (req, res) => {
  if (!ADMIN_USER || !ADMIN_PASS || !JWT_SECRET) {
    await logAuditEvent({
      eventType: 'admin.login.unavailable',
      actorType: 'admin',
      success: false,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });
    return res.status(503).json({ error: 'Admin auth is not configured on server.' });
  }

  const username = cleanText(req.body?.username, 80);
  const password = cleanText(req.body?.password, 120);
  const mfaCode = cleanText(req.body?.mfaCode, 16);

  const lockKey = getLockoutKey(username, req.ip);
  const lockInfo = failedLoginState.get(lockKey);

  if (lockInfo?.lockUntil && lockInfo.lockUntil > Date.now()) {
    await logAuditEvent({
      eventType: 'admin.login.locked',
      actorType: 'admin',
      actorId: username || null,
      success: false,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: {
        lockUntil: new Date(lockInfo.lockUntil).toISOString()
      }
    });
    return res.status(429).json({ error: 'Account temporarily locked due to failed logins. Try later.' });
  }

  if (safeEqual(username, ADMIN_USER) && safeEqual(password, ADMIN_PASS)) {
    console.log(`[Login] Success for user: ${username}`);
    if (isMfaEnabled() && !verifyMfaCode(mfaCode)) {
      const failure = registerLoginFailure(lockKey);
      await logAuditEvent({
        eventType: 'admin.login.mfa_failed',
        actorType: 'admin',
        actorId: username || null,
        success: false,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: {
          failedCount: failure.count,
          lockUntil: failure.lockUntil ? new Date(failure.lockUntil).toISOString() : null
        }
      });
      return res.status(401).json({ error: 'Invalid MFA code', mfaRequired: true });
    }

    clearLoginFailure(lockKey);

    req.session.regenerate(async (err) => {
      try {
        if (err) {
          console.error('Session regenerate error:', err);
          return res.status(500).json({ error: 'Failed to create session' });
        }

        req.session.isAdmin = true;
        req.session.username = username;
        req.session.mfaEnabled = isMfaEnabled();

        const tokens = issueAdminTokens({ username });
        setAuthCookies(res, tokens);

        try {
          await UserSession.create({
            username,
            ip: req.ip,
            userAgent: req.headers['user-agent']
          });
        } catch (sessErr) {
          console.error('Failed to create UserSession:', sessErr);
        }

        await logAuditEvent({
          eventType: 'admin.login.success',
          actorType: 'admin',
          actorId: username,
          success: true,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          details: {
            mfaEnabled: isMfaEnabled(),
            authMethod: 'session+jwt'
          }
        });

        res.json({ 
          ok: true, 
          username, 
          mfaEnabled: isMfaEnabled()
        });
      } catch (innerErr) {
        console.error('Unhandled error in session regenerate callback:', innerErr);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error during login setup' });
        }
      }
    });
  } else {
    const failure = registerLoginFailure(lockKey);
    await logAuditEvent({
      eventType: 'admin.login.failed',
      actorType: 'admin',
      actorId: username || null,
      success: false,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: {
        failedCount: failure.count,
        lockUntil: failure.lockUntil ? new Date(failure.lockUntil).toISOString() : null
      }
    });
    res.status(401).json({ error: 'Invalid credentials' });
  }
};

exports.mobileLogin = async (req, res) => {
  if (!ADMIN_USER || !ADMIN_PASS || !JWT_SECRET) {
    return res.status(503).json({ error: 'Admin auth is not configured on server.' });
  }

  const username = cleanText(req.body?.username, 80);
  const password = cleanText(req.body?.password, 120);
  const mfaCode = cleanText(req.body?.mfaCode, 16);

  const lockKey = getLockoutKey(username, req.ip);
  const lockInfo = failedLoginState.get(lockKey);

  if (lockInfo?.lockUntil && lockInfo.lockUntil > Date.now()) {
    return res.status(429).json({ error: 'Account temporarily locked.' });
  }

  if (safeEqual(username, ADMIN_USER) && safeEqual(password, ADMIN_PASS)) {
    if (isMfaEnabled() && !verifyMfaCode(mfaCode)) {
      registerLoginFailure(lockKey);
      return res.status(401).json({ error: 'Invalid MFA code', mfaRequired: true });
    }
    clearLoginFailure(lockKey);

    const tokens = issueAdminTokens({ username });
    
    // Dedicated native-admin flow: return tokens directly in JSON.
    // Does NOT establish a browser cookie or web session.
    res.json({ 
      ok: true, 
      username, 
      mfaEnabled: isMfaEnabled(),
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken
    });
  } else {
    registerLoginFailure(lockKey);
    res.status(401).json({ error: 'Invalid credentials' });
  }
};

exports.refreshToken = async (req, res) => {
  const oldToken = getTokenFromRequest(req, 'admin_refresh_token');
  if (!oldToken) return res.status(401).json({ error: 'No refresh token' });

  try {
    const rotated = rotateRefreshToken(oldToken);
    if (!rotated) {
      clearAuthCookies(res);
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    setAuthCookies(res, rotated);
    const payload = verifyAccessToken(rotated.accessToken);
    
    if (req.session && !req.session.isAdmin) {
      req.session.isAdmin = true;
      req.session.username = payload.sub;
    }

    res.json({ 
      success: true, 
      ok: true, 
      username: payload.sub
    });
  } catch (err) {
    clearAuthCookies(res);
    res.status(401).json({ error: 'Token rotation failed' });
  }
};

exports.mobileRefresh = async (req, res) => {
  const oldToken = req.body?.refreshToken;
  if (!oldToken) return res.status(401).json({ error: 'No refresh token provided' });

  try {
    const rotated = rotateRefreshToken(oldToken);
    if (!rotated) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }

    const payload = verifyAccessToken(rotated.accessToken);
    
    // Dedicated native-admin flow: return tokens directly in JSON.
    res.json({ 
      success: true, 
      ok: true, 
      username: payload.sub, 
      accessToken: rotated.accessToken,
      refreshToken: rotated.refreshToken
    });
  } catch (err) {
    res.status(401).json({ error: 'Token rotation failed' });
  }
};

exports.mobileLogout = async (req, res) => {
  const oldToken = req.body?.refreshToken;
  if (oldToken) {
    try {
      revokeRefreshToken(oldToken);
    } catch (e) {}
  }
  res.json({ ok: true });
};

exports.logout = async (req, res) => {
  try {
    const username = req.session?.username || null;
    if (username) {
      try {
        const lastSession = await UserSession.findOne({
          where: { username, logoutAt: null },
          order: [['loginAt', 'DESC']]
        });
        if (lastSession) {
          const now = new Date();
          const duration = Math.floor((now - lastSession.loginAt) / 1000);
          await lastSession.update({ logoutAt: now, duration });
        }
      } catch (sessErr) {
        console.error('Failed to update UserSession on logout:', sessErr);
      }
    }

    const refreshToken = req.cookies?.admin_refresh_token;
    if (refreshToken) revokeRefreshToken(refreshToken);
    
    req.session.destroy(async (err) => {
      try {
        clearAuthCookies(res);
        if (username) {
          await logAuditEvent({
            eventType: 'admin.logout',
            actorType: 'admin',
            actorId: username,
            success: true,
            ip: req.ip,
            userAgent: req.headers['user-agent']
          });
        }
        res.json({ ok: true });
      } catch (innerErr) {
        console.error('Unhandled error in session destroy callback:', innerErr);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Internal server error during logout' });
        }
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Logout failed' });
  }
};

exports.getSessions = async (req, res) => {
  try {
    const sessions = await UserSession.findAll({ order: [['loginAt', 'DESC']], limit: 100 });
    res.json(sessions);
  } catch (err) {
    console.error('[authController.getSessions]', err);
    res.status(500).json({ error: 'Unable to load sessions at the moment.' });
  }
};

exports.getMe = (req, res) => {
  return res.json({ username: req.user?.username || req.session?.username || null, mfaEnabled: isMfaEnabled(), authMethod: req.authMethod || 'session' });
};

exports.getMfaStatus = (req, res) => {
  return res.json({ enabled: isMfaEnabled(), issuer: 'Dholera Growth Evidence Platform' });
};

exports.getMfaProvisioningUri = (req, res) => {
  const username = req.user?.username || req.session?.username;
  if (!username) return res.status(401).json({ error: 'Unauthorized' });
  const uri = getMfaProvisioningUri({ username });
  if (!uri) return res.status(404).json({ error: 'MFA is not enabled' });
  return res.json({ uri });
};

// Extracted verifyToken middleware so it can be easily required by routes
exports.verifyToken = (req, res, next) => {
  if (req.session?.isAdmin) {
    req.user = { role: 'admin', username: req.session.username };
    return next();
  }

  const accessPayload = (() => {
    const token = getTokenFromRequest(req, 'admin_access_token');
    if (!token) return null;
    try {
      return verifyAccessToken(token);
    } catch (err) {
      return null;
    }
  })();

  if (accessPayload?.sub) {
    req.user = { role: 'admin', username: accessPayload.sub };
    req.authMethod = 'access-token';
    
    if (req.session && !req.session.isAdmin) {
      req.session.isAdmin = true;
      req.session.username = accessPayload.sub;
    }
    
    return next();
  }

  const refreshToken = req.cookies?.admin_refresh_token;
  if (refreshToken) {
    try {
      const rotated = rotateRefreshToken(refreshToken);
      if (rotated?.accessToken && rotated?.refreshToken) {
        setAuthCookies(res, rotated);
        const refreshedPayload = verifyAccessToken(rotated.accessToken);
        req.user = { role: 'admin', username: refreshedPayload.sub };
        req.authMethod = 'refresh-token';
        req.authRefreshed = true;

        if (req.session && !req.session.isAdmin) {
          req.session.isAdmin = true;
          req.session.username = refreshedPayload.sub;
        }

        return next();
      }
    } catch (err) {
      clearAuthCookies(res);
    }
  }

  return res.status(401).json({ error: 'Unauthorized' });
};
