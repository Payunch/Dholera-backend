const https = require('https');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

function sendRecoveryRequest(id, content, lang) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ id, content, lang });
    
    const options = {
      hostname: 'api.dholeraplatform.com',
      port: 443,
      path: '/api/updates/recover-post',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    
    const req = https.request(options, (res) => {
      let resData = '';
      res.on('data', (c) => resData += c);
      res.on('end', () => resolve(resData));
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function run() {
  console.log('Fetching live posts...');
  const posts = await fetchJson('https://api.dholeraplatform.com/api/updates?all=true');
  
  let count = 0;
  for (const post of posts) {
    if (post.lang === 'en') {
      try {
        await sendRecoveryRequest(post.id, post.content, 'en');
        count++;
      } catch (err) {
        console.error(`Failed to refresh POST ${post.id}:`, err.message);
      }
    }
  }
  
  console.log(`\nDeleted old translations for ${count} posts.`);
  
  console.log('Triggering background translations for all content...');
  await fetchJson('https://api.dholeraplatform.com/api/updates?lang=hi');
  await fetchJson('https://api.dholeraplatform.com/api/updates?lang=gu');
  console.log('Translations triggered!');
}

run().catch(console.error);
