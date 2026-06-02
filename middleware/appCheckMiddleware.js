/**
 * appCheckMiddleware.js
 * 
 * Verifies the Firebase App Check token provided in the X-Firebase-AppCheck header.
 * This ensures that only officially signed versions of the Flutter app or the 
 * Web frontend can access sensitive backend routes.
 */

const admin = require('firebase-admin');

/**
 * Middleware to enforce Firebase App Check
 */
async function appCheckVerification(req, res, next) {
  // Allow bypassing App Check in non-production environments if needed
  if (process.env.NODE_ENV !== 'production' && process.env.BYPASS_APP_CHECK === 'true') {
    return next();
  }

  const appCheckToken = req.header('X-Firebase-AppCheck');

  if (!appCheckToken) {
    console.warn(`[AppCheck] Unauthorized access attempt from IP: ${req.ip}`);
    return res.status(401).json({ error: 'App Check token missing. Unauthorized device.' });
  }

  try {
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
