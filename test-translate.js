const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

async function test() {
  const geminiApiKey = process.env.GEMINI_API_KEY_free || process.env.GEMINI_API_KEY;
  console.log('Key available:', !!geminiApiKey);
  const ai = new GoogleGenerativeAI(geminiApiKey);
  const model = ai.getGenerativeModel({ model: process.env.GEMINI_TEXT_MODEL || 'gemini-3.6-flash' });
  
  const prompt = `You are an expert English to Hindi translator.
Your task is to translate a real estate blog post from English into Hindi.

CRITICAL INSTRUCTIONS:
1. Translate ALL human-readable text, paragraphs, headings, and list items into Hindi.
2. PRESERVE ALL HTML tags exactly as they are. Do not translate tag names, class names, IDs, inline styles, URLs (href, src), or alt attributes.
3. Only translate the text CONTENT located between the HTML tags.
4. Output your response strictly as a JSON object with two keys: "title" and "content".
5. DO NOT wrap the JSON in markdown code blocks (\`\`\`json). Return raw JSON only.

---
Input Title to translate:
Dholera Smart City

Input HTML Content to translate:
<div class="test"><p>Welcome to Dholera!</p><a href="/link">Click here</a></div>`;

  const response = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { responseMimeType: 'application/json' }
  });
  console.log(response.response.text());
}
test().catch(console.error);
