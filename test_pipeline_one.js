require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Update } = require('./models');

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function callGeminiWithFallback(prompt) {
  const models = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash'];
  let lastErr = null;
  for (const m of models) {
    try {
      const model = ai.getGenerativeModel({
        model: m,
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.3
        }
      });
      const res = await model.generateContent(prompt);
      return JSON.parse(res.response.text());
    } catch (e) {
      console.warn(`[WARN] Model ${m} failed: ${e.message}, trying next...`);
      lastErr = e;
    }
  }
  throw lastErr;
}

async function run() {
  const post = await Update.findByPk(51);
  console.log(`Testing post ID ${post.id}: "${post.title}"`);

  const prompt = `You are an expert bilingual content creator & SEO specialist for DholeraPlatform.com (real estate & smart city portal in Dholera SIR, Gujarat).

Post Details:
ID: ${post.id}
Title: ${post.title}
Category: ${post.category}
Original Content Summary / Excerpt:
${post.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').slice(0, 3000)}

Generate the following:
1. "Bava Hindi" (सरल, बोलचाल की, आम इंसान को आसानी से समझ आने वाली हिंदी):
   - title_hi: Catchy, simple Hindi title (no complex Sanskrit words).
   - content_hi: Full blog content in clean HTML (using <h2>, <h3>, <p>, <ul>, <li>). Structure it with clear sections: परिचय (Introduction), मुख्य फायदे (Key Highlights), प्लॉट की कीमत और लोकेशन (Pricing & Location), आवश्यक सावधानियां (Tips & Checklist), और संपर्क (Contact CTA).
   Must end with:
   <hr/>
   <p><strong>संपर्क करें (Contact Us):</strong></p>
   <p>📞 Call / WhatsApp: <a href="https://wa.me/917435808031" target="_blank" rel="noopener noreferrer"><strong>+91 7435808031</strong></a></p>
   <p>🌐 Website: <a href="https://dholeraplatform.com/contact"><strong>https://dholeraplatform.com/contact</strong></a></p>

2. "Bava Gujarati" (સરળ, વ્યવહારુ બોલચાલની, સામાન્ય માણસને તરત સમજાય તેવી ગુજરાતી):
   - title_gu: Catchy, simple Gujarati title (daily conversational Gujarati).
   - content_gu: Full blog content in clean HTML (using <h2>, <h3>, <p>, <ul>, <li>). Structure it with clear sections: પરિચય (Introduction), મુખ્ય ફાયદા (Key Highlights), પ્લોટના ભાવ અને લોકેશન (Pricing & Location), જરૂરી સાવચેતી (Checklist), અને સંપર્ક (Contact CTA).
   Must end with:
   <hr/>
   <p><strong>સંપર્ક કરો (Contact Us):</strong></p>
   <p>📞 Call / WhatsApp: <a href="https://wa.me/917435808031" target="_blank" rel="noopener noreferrer"><strong>+91 7435808031</strong></a></p>
   <p>🌐 Website: <a href="https://dholeraplatform.com/contact"><strong>https://dholeraplatform.com/contact</strong></a></p>

3. SEO Optimization (80%+ SEO standard):
   - seoTitle: Exactly 50 to 60 characters long. High click-through rate, includes core keyword.
   - seoDescription: Exactly 140 to 160 characters long. Compelling summary with actionable hook.
   - seoKeywords: 5 to 7 high-intent search keywords, comma-separated.
   - tags: 5 to 7 relevant tags, comma-separated.
   - imageAltText: Clean descriptive alt text under 100 characters including primary keyword.
   - imageTitle: Clean image title under 80 characters.
   - slug: Clean, URL-friendly lowercase hyphenated slug.

Return ONLY a valid JSON object matching this schema:
{
  "seoTitle": "...",
  "seoDescription": "...",
  "seoKeywords": "...",
  "tags": "...",
  "imageAltText": "...",
  "imageTitle": "...",
  "slug": "...",
  "title_hi": "...",
  "content_hi": "...",
  "title_gu": "...",
  "content_gu": "..."
}`;

  const t0 = Date.now();
  const data = await callGeminiWithFallback(prompt);
  console.log(`Generated in ${Date.now() - t0}ms:`);
  console.log(`SEO Title (${data.seoTitle?.length} chars): ${data.seoTitle}`);
  console.log(`SEO Desc (${data.seoDescription?.length} chars): ${data.seoDescription}`);
  console.log(`SEO Keywords: ${data.seoKeywords}`);
  console.log(`Slug: ${data.slug}`);
  console.log(`Title HI: ${data.title_hi}`);
  console.log(`Title GU: ${data.title_gu}`);
  console.log(`Content HI length: ${data.content_hi?.length} chars`);
  console.log(`Content GU length: ${data.content_gu?.length} chars`);
  console.log(`Sample Content HI:\n${data.content_hi.substring(0, 300)}...\n`);
  console.log(`Sample Content GU:\n${data.content_gu.substring(0, 300)}...\n`);

  process.exit();
}

run().catch(e => { console.error('Error:', e); process.exit(1); });
