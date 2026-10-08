// Extract just IDs, titles, published status, and translation status from public API
const https = require('https');

const url = 'https://api.dholeraplatform.com/api/updates';

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const updates = JSON.parse(data);
    console.log(`Total published posts: ${updates.length}\n`);
    
    let missingTranslation = 0;
    for (const u of updates) {
      const hasGu = u.title_gu ? 'YES' : 'NO';
      const hasHi = u.title_hi ? 'YES' : 'NO';
      const hasSeo = u.seoTitle ? 'YES' : 'NO';
      if (!u.title_gu || !u.title_hi) missingTranslation++;
      console.log(`ID:${u.id} | pub=${u.published} | approved=${u.isApproved} | GU:${hasGu} | HI:${hasHi} | SEO:${hasSeo} | "${u.title?.substring(0,70)}"`);
    }
    console.log(`\nPosts missing translations: ${missingTranslation} / ${updates.length}`);
  });
}).on('error', err => console.error(err));
