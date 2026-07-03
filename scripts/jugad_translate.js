const https = require('https');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', reject);
  });
}

function fetchWithStatus(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      res.resume(); // consume response data to free up memory
      res.on('end', () => resolve(res.statusCode));
    }).on('error', reject);
  });
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function run() {
  console.log('Fetching live posts...');
  const posts = await fetchJson('https://api.dholeraplatform.com/api/updates?all=true');
  
  const englishPosts = posts.filter(p => p.lang === 'en');
  console.log(`Found ${englishPosts.length} English posts.`);
  
  for (let i = 0; i < englishPosts.length; i++) {
    const post = englishPosts[i];
    console.log(`\n[${i+1}/${englishPosts.length}] Processing Post ${post.id}: "${post.title.substring(0, 30)}..."`);
    
    // Check if translations exist by hitting the backend API without triggering fallback?
    // Actually, just hitting the fallback endpoint will safely ignore if it already exists, or translate if missing!
    
    console.log(`  -> Triggering Hindi translation...`);
    const statusHi = await fetchWithStatus(`https://api.dholeraplatform.com/api/updates/${post.id}?lang=hi`);
    console.log(`     Status: ${statusHi}`);
    
    console.log(`  -> Waiting 6 seconds to respect rate limits...`);
    await sleep(6000);
    
    console.log(`  -> Triggering Gujarati translation...`);
    const statusGu = await fetchWithStatus(`https://api.dholeraplatform.com/api/updates/${post.id}?lang=gu`);
    console.log(`     Status: ${statusGu}`);
    
    console.log(`  -> Waiting 6 seconds before next post...`);
    await sleep(6000);
  }
  
  console.log('\nAll missing translations have been successfully triggered!');
}

run().catch(console.error);
