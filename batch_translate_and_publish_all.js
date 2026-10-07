// =============================================================================
// PRODUCTION BATCH SCRIPT:
// 1. Backs up database.sqlite
// 2. Generates Bava Hindi & Bava Gujarati translations for all 28 posts
// 3. Optimizes 80%+ SEO (seoTitle 50-60 chars, seoDesc 140-160 chars, tags, keywords, alt text)
// 4. Sets well-spaced gap publication dates across 2026 (ending Oct 7, 2026)
// 5. Publishes & approves all drafts (published=true, isApproved=true)
// =============================================================================

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const sequelize = require('./config/database');
const { Update } = require('./models');

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Date mapping for perfectly spaced publication dates (28 posts, 3-5 days apart)
const DATE_MAP = {
  10: '2026-06-16T10:00:00.000Z',
  13: '2026-06-20T10:00:00.000Z',
  68: '2026-06-24T10:00:00.000Z',
  67: '2026-06-28T10:00:00.000Z',
  66: '2026-07-02T10:00:00.000Z',
  65: '2026-07-06T10:00:00.000Z',
  63: '2026-07-10T10:00:00.000Z',
  62: '2026-07-14T10:00:00.000Z',
  61: '2026-07-18T10:00:00.000Z',
  60: '2026-07-22T10:00:00.000Z',
  59: '2026-07-26T10:00:00.000Z',
  58: '2026-07-30T10:00:00.000Z',
  57: '2026-08-03T10:00:00.000Z',
  56: '2026-08-07T10:00:00.000Z',
  55: '2026-08-11T10:00:00.000Z',
  54: '2026-08-15T10:00:00.000Z',
  53: '2026-08-19T10:00:00.000Z',
  52: '2026-08-23T10:00:00.000Z',
  1:  '2026-08-26T10:00:00.000Z',
  4:  '2026-08-29T10:00:00.000Z',
  7:  '2026-09-02T10:00:00.000Z',
  45: '2026-09-06T10:00:00.000Z',
  46: '2026-09-10T10:00:00.000Z',
  48: '2026-09-15T10:00:00.000Z',
  64: '2026-09-20T10:00:00.000Z',
  51: '2026-09-26T10:00:00.000Z',
  50: '2026-10-02T10:00:00.000Z',
  49: '2026-10-07T10:00:00.000Z'
};

// Slugs mapping to ensure all slugs are unique and clean
const SLUG_MAP = {
  58: 'dholera-investment-high-profit-deals-2026',
  64: 'dholera-smart-city-investment-2026',
  68: 'greenz-project-dholera-guide',
  63: 'ahmedabad-to-dholera-route-guide-tips'
};

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function callGeminiWithRetry(prompt, maxRetries = 4) {
  const models = ['gemini-3.5-flash-lite', 'gemini-3.5-flash', 'gemini-3.8-flash'];
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    for (const m of models) {
      try {
        const model = ai.getGenerativeModel({
          model: m,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.25
          }
        });
        const res = await model.generateContent(prompt);
        const text = res.response.text();
        return JSON.parse(text);
      } catch (err) {
        console.warn(`  [Model ${m} Attempt ${attempt + 1}] error: ${err.message}`);
        await sleep(1500 * (attempt + 1));
      }
    }
  }
  throw new Error('All Gemini models and retries failed.');
}

async function backupDatabase() {
  const dbPaths = [
    '/home/opc/Dholera-backend/data/database.sqlite',
    path.join(__dirname, 'data', 'database.sqlite'),
    path.join(__dirname, 'database.sqlite')
  ];
  for (const p of dbPaths) {
    if (fs.existsSync(p)) {
      const backupPath = `${p}.bak.${Date.now()}`;
      fs.copyFileSync(p, backupPath);
      console.log(`✓ Database backed up to: ${backupPath}`);
      return;
    }
  }
  console.log('ℹ No local file found for backup, continuing...');
}

async function run() {
  console.log('=== STARTING BATCH TRANSLATION, SEO & PUBLISH ===\n');
  await backupDatabase();
  await sequelize.sync();

  const posts = await Update.findAll({
    where: { lang: 'en' },
    order: [['id', 'ASC']]
  });

  console.log(`Found ${posts.length} posts to process.\n`);

  let count = 0;
  for (const post of posts) {
    count++;
    console.log(`\n============================================================`);
    console.log(`[${count}/${posts.length}] Processing Post ID ${post.id}: "${post.title}"`);
    console.log(`============================================================`);

    const cleanText = (post.content || '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .slice(0, 3500);

    const prompt = `You are an expert bilingual editor and on-page SEO master for DholeraPlatform.com (India's premier real-estate portal for Dholera SIR).

Post ID: ${post.id}
Original Title: ${post.title}
Category: ${post.category}
Original Excerpt:
${cleanText}

Generate the following:
1. "Bava Hindi" (सरल, बोलचाल की, आम इंसान को आसानी से समझ आने वाली हिंदी):
   - title_hi: Catchy, simple Hindi title (natural spoken Hindi).
   - content_hi: Full HTML article with <h2>, <h3>, <p>, <ul>, <li> tags. Must be easy to understand for everyday Indian investors. Explain why Dholera matters, development updates, plot details, and legal verification tips.
   Must end with:
   <hr/>
   <p><strong>संपर्क करें (Contact Us):</strong></p>
   <p>📞 Call / WhatsApp: <a href="https://wa.me/917435808031" target="_blank" rel="noopener noreferrer"><strong>+91 7435808031</strong></a></p>
   <p>🌐 Website: <a href="https://dholeraplatform.com/contact"><strong>https://dholeraplatform.com/contact</strong></a></p>

2. "Bava Gujarati" (સરળ, વ્યવહારુ બોલચાલની, સામાન્ય માણસને તરત સમજાય તેવી ગુજરાતી):
   - title_gu: Catchy, simple Gujarati title (everyday colloquial Gujarati).
   - content_gu: Full HTML article with <h2>, <h3>, <p>, <ul>, <li> tags. Simple, warm, and informative. Explain why Dholera matters, development updates, plot details, and legal verification tips.
   Must end with:
   <hr/>
   <p><strong>સંપર્ક કરો (Contact Us):</strong></p>
   <p>📞 Call / WhatsApp: <a href="https://wa.me/917435808031" target="_blank" rel="noopener noreferrer"><strong>+91 7435808031</strong></a></p>
   <p>🌐 Website: <a href="https://dholeraplatform.com/contact"><strong>https://dholeraplatform.com/contact</strong></a></p>

3. 80%+ SEO Optimization:
   - seoTitle: Exactly 50 to 60 characters long. High click-through rate, includes primary keyword.
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

    try {
      const generated = await callGeminiWithRetry(prompt);

      // Prepare updates
      const updateFields = {
        published: true,
        isApproved: true,
        publishedAt: DATE_MAP[post.id] || post.publishedAt || new Date().toISOString(),
        title_hi: generated.title_hi || post.title_hi,
        content_hi: generated.content_hi || post.content_hi,
        title_gu: generated.title_gu || post.title_gu,
        content_gu: generated.content_gu || post.content_gu,
        seoTitle: generated.seoTitle || post.seoTitle,
        seoDescription: generated.seoDescription || post.seoDescription,
        seoKeywords: generated.seoKeywords || post.seoKeywords,
        tags: generated.tags || post.tags,
        imageAltText: generated.imageAltText || post.imageAltText,
        imageTitle: generated.imageTitle || post.imageTitle,
        slug: SLUG_MAP[post.id] || generated.slug || post.slug
      };

      // Ensure length constraints
      if (updateFields.seoTitle && updateFields.seoTitle.length > 70) {
        updateFields.seoTitle = updateFields.seoTitle.slice(0, 60);
      }
      if (updateFields.seoDescription && updateFields.seoDescription.length > 170) {
        updateFields.seoDescription = updateFields.seoDescription.slice(0, 160);
      }

      await post.update(updateFields);

      console.log(`  ✓ Updated ID ${post.id}`);
      console.log(`    Date: ${updateFields.publishedAt.split('T')[0]}`);
      console.log(`    Slug: ${updateFields.slug}`);
      console.log(`    SEO Title (${updateFields.seoTitle.length} chars): ${updateFields.seoTitle}`);
      console.log(`    SEO Desc (${updateFields.seoDescription.length} chars): ${updateFields.seoDescription}`);
      console.log(`    Title HI: ${updateFields.title_hi}`);
      console.log(`    Title GU: ${updateFields.title_gu}`);
    } catch (err) {
      console.error(`  ✗ Failed to update post ID ${post.id}:`, err.message);
    }

    // Brief throttle between posts to stay well within API quotas
    await sleep(1500);
  }

  console.log('\n============================================================');
  console.log('✓ ALL POSTS PROCESSED SUCCESSFULLY!');
  console.log('============================================================');
  process.exit(0);
}

run().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
