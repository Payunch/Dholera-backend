require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  const key = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenerativeAI(key);
  for (const m of ['gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-2.5-pro', 'gemini-1.5-flash-latest']) {
    try {
      const model = ai.getGenerativeModel({ model: m });
      const res = await model.generateContent('Say hello in Gujarati');
      console.log(`Success with ${m}:`, res.response.text());
      break;
    } catch (e) {
      console.log(`Failed with ${m}:`, e.message);
    }
  }
  process.exit();
}

testGemini();
