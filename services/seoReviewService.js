const { GoogleGenerativeAI } = require('@google/generative-ai');

const stripCodeFences = (value = '') => value.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

function parseJson(value) {
  const source = stripCodeFences(value);
  const start = source.indexOf('{');
  const end = source.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('AI did not return a JSON object.');
  return JSON.parse(source.slice(start, end + 1));
}

function safeText(value, maxLength = 500) {
  return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

async function reviewBlogForSeo({ title, content, category, focusKeyword, seoTitle, seoDescription, slug, imageAltText, tags }) {
  // The interactive admin review deliberately uses the free key only. It must
  // never fall back to GEMINI_API_KEY, which is reserved for auto-blog jobs.
  const geminiApiKey = process.env.GEMINI_API_KEY_free || '';
  if (!geminiApiKey) throw new Error('Free Gemini SEO-review key is not configured on the server.');

  const ai = new GoogleGenerativeAI(geminiApiKey);
  const model = ai.getGenerativeModel({ model: process.env.GEMINI_TEXT_MODEL || 'gemini-3.6-flash' });
  const prompt = `You are a careful SEO editor for DholeraPlatform.com, an India-focused Dholera SIR information and real-estate portal.
Review the blog below. Do not invent facts, prices, project approvals, timelines, or links. Do not make guaranteed-return claims.
Give specific improvements that help the editor meet a 90+ on-page SEO checklist. This is an estimate, not a Rank Math score.

Return only valid JSON with exactly this shape:
{
  "estimatedScore": 0,
  "primaryKeyword": "",
  "seoTitle": "",
  "metaDescription": "",
  "slug": "",
  "imageAltText": "",
  "imageTitle": "",
  "tags": [""],
  "missingItems": [""],
  "improvements": [""],
  "faqQuestions": [""]
}

Rules: title 50-60 characters; meta description 140-160 characters; slug lowercase hyphen-separated; 5-8 tags; ALT text must naturally include the primary keyword; give four FAQ questions only when suitable.

Current values:
Title: ${safeText(title, 255)}
Category: ${safeText(category, 100)}
Focus keyword: ${safeText(focusKeyword, 160)}
SEO title: ${safeText(seoTitle, 255)}
Meta description: ${safeText(seoDescription, 400)}
Slug: ${safeText(slug, 120)}
Image ALT: ${safeText(imageAltText, 255)}
Tags: ${safeText(tags, 400)}
Article HTML/Markdown:
${safeText(content, 45000)}`;

  const response = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 1800, temperature: 0.2 }
  });
  const result = parseJson(response.response.text());
  return {
    estimatedScore: Math.max(0, Math.min(100, Number(result.estimatedScore) || 0)),
    primaryKeyword: safeText(result.primaryKeyword, 160),
    seoTitle: safeText(result.seoTitle, 60),
    metaDescription: safeText(result.metaDescription, 160),
    slug: safeText(result.slug, 120).toLowerCase().replace(/[^a-z0-9-]/g, ''),
    imageAltText: safeText(result.imageAltText, 255),
    imageTitle: safeText(result.imageTitle, 255),
    tags: Array.isArray(result.tags) ? result.tags.map(tag => safeText(tag, 60)).filter(Boolean).slice(0, 8) : [],
    missingItems: Array.isArray(result.missingItems) ? result.missingItems.map(item => safeText(item, 240)).filter(Boolean).slice(0, 8) : [],
    improvements: Array.isArray(result.improvements) ? result.improvements.map(item => safeText(item, 240)).filter(Boolean).slice(0, 8) : [],
    faqQuestions: Array.isArray(result.faqQuestions) ? result.faqQuestions.map(item => safeText(item, 180)).filter(Boolean).slice(0, 4) : []
  };
}

module.exports = { reviewBlogForSeo };
