const admin = require('firebase-admin');

const fs = require('fs');
const path = require('path');

// Load Firebase Service Account from env variable or file
let serviceAccount = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    serviceAccount = typeof process.env.FIREBASE_SERVICE_ACCOUNT === 'string'
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : process.env.FIREBASE_SERVICE_ACCOUNT;
  } catch (e) {
    console.error('[Notification] Error parsing FIREBASE_SERVICE_ACCOUNT env:', e.message);
  }
}

if (!serviceAccount) {
  const possiblePaths = [
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH,
    path.join(__dirname, '../config/firebase-service-account.json'),
    path.join(__dirname, '../../user-management-admin-1128f-firebase-adminsdk-fbsvc-90b9de76f9.json'),
  ];
  for (const p of possiblePaths) {
    if (p && fs.existsSync(p)) {
      try {
        serviceAccount = JSON.parse(fs.readFileSync(p, 'utf8'));
        console.log(`[Notification] Loaded Firebase Service Account from ${p}`);
        break;
      } catch (err) {
        console.warn(`[Notification] Failed loading from ${p}:`, err.message);
      }
    }
  }
}

if (serviceAccount && admin.apps.length === 0) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
  console.log('[Notification] Firebase Admin Initialized successfully for project:', serviceAccount.project_id);
} else if (!serviceAccount) {
  console.warn('[Notification] Firebase Service Account missing. Push notifications disabled.');
}

function formatValidImageUrl(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  if (trimmed.startsWith('/')) {
    return `https://api.dholeraplatform.com${trimmed}`;
  }
  return null;
}

/**
 * Sends a push notification to a specific FCM token.
 */
async function sendDirectNotification(token, title, body, data = {}) {
  if (!serviceAccount || !token) return;

  const formattedImageUrl = formatValidImageUrl(data.imageUrl);

  const message = {
    notification: { 
      title, 
      body,
      ...(formattedImageUrl ? { imageUrl: formattedImageUrl } : {})
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'dholera_general_channel',
        sound: 'default',
        priority: 'high',
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        ...(formattedImageUrl ? { imageUrl: formattedImageUrl } : {})
      }
    },
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
  if (!serviceAccount) {
    console.warn(`[Notification] Cannot send to topic '${topic}': Firebase Service Account not configured.`);
    return { success: false, error: 'Firebase Service Account missing' };
  }

  const formattedImageUrl = formatValidImageUrl(data.imageUrl);

  const message = {
    notification: { 
      title, 
      body,
      ...(formattedImageUrl ? { imageUrl: formattedImageUrl } : {})
    },
    android: {
      priority: 'high',
      notification: {
        channelId: 'dholera_general_channel',
        sound: 'default',
        priority: 'high',
        clickAction: 'FLUTTER_NOTIFICATION_CLICK',
        ...(formattedImageUrl ? { imageUrl: formattedImageUrl } : {})
      }
    },
    data: { 
      ...data,
      click_action: 'FLUTTER_NOTIFICATION_CLICK' 
    },
    topic: topic
  };

  try {
    const response = await admin.messaging().send(message);
    console.log(`[Notification] Push notification sent to topic '${topic}':`, response);
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
