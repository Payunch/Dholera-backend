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

const { GoogleGenerativeAI } = require('@google/generative-ai');

function stripCodeFences(text) {
  return (text || '').replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
}

async function generateBavaTranslations({ title, content }) {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }
  const ai = new GoogleGenerativeAI(geminiApiKey);
  const models = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash'];

  const prompt = `You are an expert bilingual content translator for Dholera Smart City real estate.
Translate the following English blog post into TWO languages:

1. "Bava Hindi" (सरल, बोलचाल की, आम इंसान को आसानी से समझ आने वाली हिंदी):
   - Natural, conversational, everyday Hindi that any prospective investor or land buyer can immediately understand.
   - Avoid overly complex, bookish, or Sanskritized words. Keep English industry terms like "Smart City", "Expressway", "Airport", "Plot", "Investment", "Metro" in simple Hinglish/Devanagari (e.g. स्मार्ट सिटी, एक्सप्रेसवे).

2. "Bava Gujarati" (સરળ, વ્યવહારુ બોલચાલની, સામાન્ય માણસને તરત સમજાય તેવી ગુજરાતી):
   - Natural, colloquial Gujarati business/conversational style used in Gujarat.
   - Avoid heavy archaic terms. Keep key terms naturally transliterated (e.g. સ્માર્ટ સિટી, પ્લોટ, રોકાણ).

CRITICAL INSTRUCTIONS:
- Preserve all HTML tags (<p>, <h2>, <h3>, <ul>, <ol>, <li>, <a>, <strong>, <em>, <table>, etc.) and anchor href links exactly.
- Return ONLY a valid JSON object with these exact keys:
{
  "title_hi": "Simple Hindi Title",
  "content_hi": "Full HTML content translated into Bava Hindi",
  "title_gu": "Simple Gujarati Title",
  "content_gu": "Full HTML content translated into Bava Gujarati"
}

English Title: ${title}
English Content:
${content}
`;

  let lastError = null;
  for (const m of models) {
    try {
      const model = ai.getGenerativeModel({
        model: m,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.2
        }
      });
      const response = await model.generateContent(prompt);
      const text = response.response.text();
      const parsed = JSON.parse(stripCodeFences(text));
      if (parsed.title_hi && parsed.content_hi && parsed.title_gu && parsed.content_gu) {
        return parsed;
      }
    } catch (err) {
      lastError = err;
      console.warn(`[generateBavaTranslations] Model ${m} failed: ${err.message}`);
    }
  }
  throw new Error(`All translation models failed: ${lastError?.message}`);
}

module.exports = { translateBlogPost, generateBavaTranslations };
