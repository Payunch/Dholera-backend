require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGemini() {
  const key = process.env.GEMINI_API_KEY;
  console.log('Key length:', key ? key.length : 0);
  console.log('Key starts with:', key ? key.substring(0, 6) : 'none');
  
  const ai = new GoogleGenerativeAI(key);
  try {
    const model = ai.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const res = await model.generateContent('Say hello in Gujarati');
    console.log('Gemini 1.5 Flash result:', res.response.text());
  } catch (e1) {
    console.log('Gemini 1.5 flash failed:', e1.message);
    try {
      const model2 = ai.getGenerativeModel({ model: 'gemini-2.0-flash' });
      const res2 = await model2.generateContent('Say hello in Gujarati');
      console.log('Gemini 2.0 Flash result:', res2.response.text());
    } catch (e2) {
      console.log('Gemini 2.0 flash failed:', e2.message);
    }
  }
  process.exit();
}

testGemini();
