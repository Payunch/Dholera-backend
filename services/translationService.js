/**
 * translationService.js
 *
 * Provides automated translation capabilities for blog posts.
 * Uses 'translate-google' which is a free, key-less wrapper for Google Translate.
 */

const translate = require('translate-google');

/**
 * Translates a blog payload into multiple languages.
 * @param {Object} payload { title, content, category }
 * @param {Array} targetLangs List of language codes (e.g., ['hi', 'gu'])
 * @returns {Promise<Array>} List of translated payloads
 */
async function translateBlogPost(payload, targetLangs = ['hi', 'gu']) {
  const translations = [];

  for (const lang of targetLangs) {
    try {
      console.log(`[Translation] Translating "${payload.title}" to ${lang}...`);
      
      const translatedTitle = await translate(payload.title, { to: lang });
      const translatedContent = await translate(payload.content, { to: lang });
      
      translations.push({
        ...payload,
        title: translatedTitle,
        content: translatedContent,
        category: payload.category // Category stays the same or could be translated
      });
    } catch (err) {
      console.error(`[Translation] Failed for lang ${lang}:`, err.message);
      // Fallback: use English if translation fails
      translations.push(payload);
    }
  }

  return translations;
}

module.exports = { translateBlogPost };
