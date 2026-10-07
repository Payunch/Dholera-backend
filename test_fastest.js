require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testFastest() {
  const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  const models = ['gemini-3.5-flash', 'gemini-3.6-flash', 'gemini-3.7-flash', 'gemini-flash-latest'];
  for (const m of models) {
    try {
      const t0 = Date.now();
      const model = ai.getGenerativeModel({ model: m });
      const res = await model.generateContent('Say "OK" in Gujarati');
      console.log(`Model ${m} SUCCESS in ${Date.now() - t0}ms:`, res.response.text().trim());
    } catch (e) {
      console.log(`Model ${m} FAILED:`, e.message);
    }
  }
  process.exit();
}

testFastest();
