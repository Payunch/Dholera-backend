const admin = require('firebase-admin');
const { Lead } = require('../models');

// Note: Ensure FIREBASE_SERVICE_ACCOUNT is set in your environment variables.
// It should be a stringified JSON of your Firebase service account key.
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) 
  : null;

if (serviceAccount) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('[Notification] Firebase Admin Initialized');
} else {
  console.warn('[Notification] Firebase Service Account missing. Push notifications disabled.');
}

/**
 * Sends a push notification to the Admin App.
 * In a real scenario, you'd store the Admin's FCM tokens in the DB.
 * For now, we can use a "Topic" to send to all logged-in admins.
 */
async function sendAdminNotification(title, body, data = {}) {
  if (!serviceAccount) return;

  const message = {
    notification: { title, body },
    data: { 
      ...data,
      click_action: 'FLUTTER_NOTIFICATION_CLICK' 
    },
    topic: 'admin_alerts'
  };

  try {
    const response = await admin.messaging().send(message);
    console.log('[Notification] Sent successfully:', response);
  } catch (error) {
    console.error('[Notification] Error sending:', error);
  }
}

module.exports = { sendAdminNotification };
