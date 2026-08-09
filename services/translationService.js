/**
 * translationService.js
 *
 * Provides automated translation capabilities for blog posts.
 * In production, translations are disabled unless ENABLE_AUTO_TRANSLATION=true.
 */

const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const autoTranslationEnabled = process.env.ENABLE_AUTO_TRANSLATION === 'true';
let translate = null;

function getTranslateClient() {
  if (!autoTranslationEnabled) return null;
  if (translate) return translate;
  try {
    translate = require('translate-google');
    return translate;
  } catch (err) {
    console.warn('[Translation] translate-google is unavailable, returning source text.');
    return null;
  }
}

async function translateInChunks(text, lang) {
  if (!text) return text;
  const translateClient = getTranslateClient();
  if (!translateClient) return text;
  if (text.length < 4000) {
    return await translateClient(text, { to: lang });
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
    
    const translatedChunk = await translateClient(chunk, { to: lang });
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
  if (!autoTranslationEnabled) {
    return targetLangs.map(() => payload);
  }
  const translations = [];

  for (const lang of targetLangs) {
    try {
      console.log(`[Translation] Translating "${payload.title}" to ${lang}...`);
      
      const translateClient = getTranslateClient();
      if (!translateClient) {
        translations.push(payload);
        continue;
      }
      const translatedTitle = await translateClient(payload.title, { to: lang });
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
