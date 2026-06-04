const admin = require('firebase-admin');

// Note: Ensure FIREBASE_SERVICE_ACCOUNT is set in your environment variables.
const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
  ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT) 
  : null;

if (serviceAccount && admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('[Notification] Firebase Admin Initialized');
} else if (!serviceAccount) {
  console.warn('[Notification] Firebase Service Account missing. Push notifications disabled.');
}

/**
 * Sends a push notification to a specific FCM token.
 */
async function sendDirectNotification(token, title, body, data = {}) {
  if (!serviceAccount || !token) return;

  const message = {
    notification: { title, body },
    data: { 
      ...data,
      click_action: 'FLUTTER_NOTIFICATION_CLICK' 
    },
    token: token
  };

  try {
    const response = await admin.messaging().send(message);
    return { success: true, response };
  } catch (error) {
    console.error('[Notification] Error sending direct:', error);
    return { success: false, error };
  }
}

/**
 * Sends a push notification to a topic.
 */
async function sendTopicNotification(topic, title, body, data = {}) {
  if (!serviceAccount) return;

  const message = {
    notification: { title, body },
    data: { 
      ...data,
      click_action: 'FLUTTER_NOTIFICATION_CLICK' 
    },
    topic: topic
  };

  try {
    const response = await admin.messaging().send(message);
    return { success: true, response };
  } catch (error) {
    console.error('[Notification] Error sending to topic:', error);
    return { success: false, error };
  }
}

/**
 * Convenience method for Admin alerts.
 */
async function sendAdminNotification(title, body, data = {}) {
  return sendTopicNotification('admin_alerts', title, body, data);
}

/**
 * Convenience method for Investor updates.
 */
async function sendInvestorNotification(title, body, data = {}) {
  return sendTopicNotification('investors', title, body, data);
}

module.exports = { 
  sendDirectNotification, 
  sendTopicNotification, 
  sendAdminNotification,
  sendInvestorNotification
};
