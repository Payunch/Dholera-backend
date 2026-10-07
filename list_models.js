require('dotenv').config();
const https = require('https');

const key = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (parsed.models) {
        console.log('Available models:');
        parsed.models
          .filter(m => m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent'))
          .forEach(m => console.log(' - ' + m.name.replace('models/', '')));
      } else {
        console.log('Error/Response:', data);
      }
    } catch (e) {
      console.log('Parse error:', e.message);
    }
    process.exit();
  });
}).on('error', err => {
  console.error('Fetch error:', err);
  process.exit(1);
});
