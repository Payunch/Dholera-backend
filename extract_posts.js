// Extract titles from production API for translation
const https = require('https');

const url = 'https://api.dholeraplatform.com/api/updates';

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const updates = JSON.parse(data);
    for (const u of updates) {
      console.log(`\n=== ID: ${u.id} ===`);
      console.log(`Title: ${u.title}`);
      console.log(`Category: ${u.category}`);
      console.log(`Published: ${u.published}, Approved: ${u.isApproved}`);
      console.log(`Date: ${u.publishedAt}`);
      console.log(`Content length: ${u.content?.length || 0}`);
      console.log(`SEO Title: ${u.seoTitle}`);
      console.log(`SEO Desc: ${u.seoDescription}`);
    }
  });
}).on('error', err => console.error(err));
