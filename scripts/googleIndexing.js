const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

// Path to your service account key file
const KEY_PATH = path.join(__dirname, '..', 'config', 'service_account.json');

/**
 * Request Google to index a specific URL immediately.
 * @param {string} url - The exact absolute URL to index (e.g. 'https://www.dholeraplatform.com/blogs/my-post')
 */
async function pushIndexUrl(url) {
  if (!fs.existsSync(KEY_PATH)) {
    console.warn(`[Google Indexing] Service account key not found at ${KEY_PATH}. Skipping push index for ${url}.`);
    return false;
  }

  try {
    const auth = new google.auth.GoogleAuth({
      keyFile: KEY_PATH,
      scopes: ['https://www.googleapis.com/auth/indexing'],
    });

    const client = await auth.getClient();
    const indexing = google.indexing({ version: 'v3', auth: client });

    const response = await indexing.urlNotifications.publish({
      requestBody: {
        url: url,
        type: 'URL_UPDATED',
      },
    });

    console.log(`[Google Indexing] Successfully requested indexing for ${url}`, response.data);
    return true;
  } catch (error) {
    console.error(`[Google Indexing] Failed to request indexing for ${url}:`, error.message);
    return false;
  }
}

module.exports = {
  pushIndexUrl,
};
