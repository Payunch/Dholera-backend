/**
 * appCheckMiddleware.js
 * 
 * Verifies the Firebase App Check token provided in the X-Firebase-AppCheck header.
 * This ensures that only officially signed versions of the Flutter app or the 
 * Web frontend can access sensitive backend routes.
 */

const admin = require('firebase-admin');
const { verifyAccessToken } = require('../services/adminSecurity');
const { Lead } = require('../models');

/**
 * Middleware to enforce Firebase App Check
 */
async function appCheckVerification(req, res, next) {
  // 1. Allow bypassing App Check in non-production environments
  if (process.env.NODE_ENV !== 'production' && process.env.BYPASS_APP_CHECK === 'true') {
    return next();
  }

  // 2. MOBILE & SESSION COMPATIBILITY: Priority to authenticated identity
  // If we have a validated admin session, we bypass App Check.
  if (req.session?.isAdmin) {
    return next();
  }

  if (req.cookies?.admin_access_token || req.headers.authorization?.startsWith('Bearer ')) {
    const token = req.cookies?.admin_access_token || req.headers.authorization.split(' ')[1];
    try {
      verifyAccessToken(token);
      return next(); // Valid admin token, bypass App Check
    } catch (e) {
      // Invalid token, do not bypass, fall through to App Check
    }
  }

  // 3. LEAD TOKEN COMPATIBILITY: Allow valid Lead access to bypass App Check
  if (req.query.token) {
    try {
      const lead = await Lead.findOne({ where: { lead_token: req.query.token } });
      if (lead) {
        return next();
      }
    } catch (e) {}
  }

  // 4. TRIAL DOCUMENT COMPATIBILITY: Allow trial PDF to bypass App Check
  const freeTrialId = process.env.FREE_TRIAL_PDF_ID || '19';
  const pathParts = req.path.split('/');
  const pathId = req.params.id || pathParts[pathParts.length - 1];

  if (String(pathId) === String(freeTrialId)) {
    return next();
  }

  const appCheckToken = req.header('X-Firebase-AppCheck');

  if (!appCheckToken) {
    console.warn(`[AppCheck] Unauthorized access attempt from IP: ${req.ip}`);
    return res.status(401).json({ error: 'App Check token missing. Unauthorized device.' });
  }

  try {
    // Safety: If Firebase Admin was not initialized, fail closed instead of bypassing.
    if (!admin.apps.length) {
      console.error('[AppCheck] Firebase not initialized. Blocking verification request.');
      return res.status(500).json({ error: 'Server configuration error: Firebase Admin SDK is not initialized.' });
    }

    const appCheckClaims = await admin.appCheck().verifyToken(appCheckToken);
    // Token is valid. 
    // You could also check appCheckClaims.appId if you want to restrict to specific apps
    return next();
  } catch (err) {
    console.error('[AppCheck] Verification failed:', err.message);
    return res.status(401).json({ error: 'App Check verification failed. Access denied.' });
  }
}

module.exports = { appCheckVerification };
