require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testFastest() {
  const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  for (const m of ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-2.5-flash-lite']) {
    try {
      const t0 = Date.now();
      const model = ai.getGenerativeModel({ model: m });
      const res = await model.generateContent('Say "Ready" in Gujarati');
      console.log(`Model ${m} SUCCESS in ${Date.now() - t0}ms:`, res.response.text().trim());
    } catch (e) {
      console.log(`Model ${m} FAILED:`, e.message);
    }
  }
  process.exit();
}

testFastest();
