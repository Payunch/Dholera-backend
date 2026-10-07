require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  const key = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenerativeAI(key);
  for (const m of ['gemini-3.1-pro-preview', 'gemini-3.8-flash']) {
    try {
      console.log(`Trying ${m}...`);
      const model = ai.getGenerativeModel({ model: m });
      const res = await model.generateContent('Say hello in Gujarati (one short sentence)');
      console.log(`Success with ${m}:`, res.response.text());
      break;
    } catch (e) {
      console.log(`Failed with ${m}:`, e.message);
    }
  }
  process.exit();
}

testGemini();
