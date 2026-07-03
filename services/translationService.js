/**
 * translationService.js
 *
 * Provides automated translation capabilities for blog posts.
 * Uses 'translate-google' which is a free, key-less wrapper for Google Translate.
 */

const translate = require('translate-google');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function translateInChunks(text, lang) {
  if (!text) return text;
  if (text.length < 4000) {
    return await translate(text, { to: lang });
  }

  const parts = text.split(/(<\/p>|\n)/i);
  const chunks = [];
  let currentChunk = '';

  for (const part of parts) {
    if (part.trim() === '') {
       currentChunk += part;
       continue;
    }
    if ((currentChunk.length + part.length) > 4000 && currentChunk.trim().length > 0) {
      chunks.push(currentChunk);
      currentChunk = part;
    } else {
      currentChunk += part;
    }
  }
  if (currentChunk.trim().length > 0) chunks.push(currentChunk);

  let translatedText = '';
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`    [Chunk ${i+1}/${chunks.length}] Translating ${chunk.length} chars...`);
    
    // Add a 2-second delay between chunks to respect rate limits
    if (i > 0) await sleep(2000);
    
    const translatedChunk = await translate(chunk, { to: lang });
    translatedText += translatedChunk;
  }

  return translatedText;
}

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
      const translatedContent = await translateInChunks(payload.content, lang);
      
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
