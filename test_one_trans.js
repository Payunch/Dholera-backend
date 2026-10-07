require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Update } = require('./models');

async function testOneTranslation() {
  const post = await Update.findByPk(10);
  console.log('Testing translation for Post ID 10:', post.title);

  const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const model = ai.getGenerativeModel({
    model: 'gemini-3.8-flash',
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.3
    }
  });

  const prompt = `You are an expert bilingual content editor for DholeraPlatform.com (real estate and smart city portal in Gujarat, India).
Your task is to take this English blog post and provide:
1. "Bava Hindi" (सरल, बोलचाल की, आम इंसान को आसानी से समझ आने वाली हिंदी): Translation that is simple, natural, conversational, and easy to understand for any investor or buyer. Avoid overly formal or difficult Sanskritized words.
2. "Bava Gujarati" (સરળ, વ્યવહારુ બોલચાલની, સામાન્ય માણસને તરત સમજાય તેવી ગુજરાતી): Translation that is natural, colloquial, Gujarati business/conversational style. Avoid heavy or archaic words.
3. 80%+ SEO optimization metadata for the blog post:
   - seoTitle: 50-60 characters, high CTR, primary keyword included
   - seoDescription: 140-160 characters, compelling summary with call to action
   - seoKeywords: comma-separated list of 5-8 targeted search keywords
   - tags: comma-separated list of 5-8 relevant tags
   - imageAltText: descriptive ALT text including primary keyword (under 100 characters)

Original Blog Details:
Title: ${post.title}
Category: ${post.category}
Content:
${post.content.slice(0, 3000)}

Return ONLY valid JSON matching this exact structure:
{
  "seoTitle": "...",
  "seoDescription": "...",
  "seoKeywords": "...",
  "tags": "...",
  "imageAltText": "...",
  "title_hi": "...",
  "content_hi": "...",
  "title_gu": "...",
  "content_gu": "..."
}
Note: For content_hi and content_gu, provide clean semantic HTML using <h2>, <h3>, <p>, <ul>, <li> tags, and end with contact information for DholeraPlatform (+91 7435808031, https://dholeraplatform.com/contact).`;

  const res = await model.generateContent(prompt);
  const parsed = JSON.parse(res.response.text());
  console.log('SEO Title:', parsed.seoTitle, `(${parsed.seoTitle.length} chars)`);
  console.log('SEO Desc:', parsed.seoDescription, `(${parsed.seoDescription.length} chars)`);
  console.log('Hindi Title:', parsed.title_hi);
  console.log('Hindi Content preview:', parsed.content_hi.substring(0, 200));
  console.log('Gujarati Title:', parsed.title_gu);
  console.log('Gujarati Content preview:', parsed.content_gu.substring(0, 200));

  process.exit();
}

testOneTranslation().catch(err => { console.error('Error:', err); process.exit(1); });
