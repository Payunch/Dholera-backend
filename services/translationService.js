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

const cheerio = require('cheerio');
const translateClient = require('translate-google');

async function translateHtmlContent(html, lang) {
  if (!html) return html;
  
  const $ = cheerio.load(html, null, false);
  const textNodes = [];

  function traverse(i, node) {
    if (node.type === 'text') {
      const text = node.data.trim();
      if (text) {
        textNodes.push(node);
      }
    } else if (node.type === 'tag') {
      if (node.name !== 'script' && node.name !== 'style') {
        $(node).contents().each(traverse);
      }
    }
  }

  // When isDocument is false, the root is not body, it's the root itself.
  $.root().contents().each(traverse);

  if (textNodes.length === 0) return html;

  const stringsToTranslate = textNodes.map(n => n.data.trim());
  console.log('[Translation Debug] Found', stringsToTranslate.length, 'strings to translate');
  
  try {
    // Translate in batches of 10 to avoid Google Translate API limits/errors
    const batchSize = 10;
    const translatedStrings = [];

    for (let i = 0; i < stringsToTranslate.length; i += batchSize) {
      const batch = stringsToTranslate.slice(i, i + batchSize);
      const payloadObj = {};
      for (let j = 0; j < batch.length; j++) {
        payloadObj[j] = batch[j];
      }

      console.log(`[Translation Debug] Translating batch ${i} to ${i + batch.length}...`);
      if (i > 0) await sleep(1500); // Respect rate limits

      try {
        const translatedObj = await translateClient(payloadObj, { to: lang });
        for (let j = 0; j < batch.length; j++) {
          translatedStrings.push(translatedObj[j] || batch[j]); // Fallback to original if missing
        }
      } catch (err) {
        console.error(`[Translation Debug] Batch failed:`, err.message);
        // Fallback to original for this batch
        for (let j = 0; j < batch.length; j++) {
          translatedStrings.push(batch[j]);
        }
      }
    }

    // Replace text in nodes
    let replaceCount = 0;
    for (let i = 0; i < textNodes.length; i++) {
      if (translatedStrings[i] && translatedStrings[i] !== stringsToTranslate[i]) {
        textNodes[i].data = textNodes[i].data.replace(stringsToTranslate[i], translatedStrings[i]);
        replaceCount++;
      }
    }
    console.log('[Translation Debug] Replaced', replaceCount, 'nodes');
  } catch (err) {
    console.error('[Translation] Cheerio batch translate failed:', err.message);
  }

  return $.html();
}

async function translateBlogPost(payload, targetLangs = ['hi', 'gu']) {
  if (!autoTranslationEnabled) {
    return targetLangs.map(() => payload);
  }
  const translations = [];

  for (const lang of targetLangs) {
    try {
      console.log(`[Translation] Translating "${payload.title}" to ${lang} using cheerio + translate-google...`);
      
      let translatedTitle = payload.title;
      try {
          translatedTitle = await translateClient(payload.title, { to: lang });
      } catch (e) {
          console.error(`[Translation] Title translation failed for lang ${lang}:`, e.message);
      }
      
      const translatedContent = await translateHtmlContent(payload.content, lang);

      translations.push({
        ...payload,
        title: translatedTitle,
        content: translatedContent,
        category: payload.category
      });
    } catch (err) {
      console.error(`[Translation] Failed for lang ${lang}:`, err.message);
      translations.push(payload);
    }
  }

  return translations;
}

module.exports = { translateBlogPost };
