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
  
  let recoveredCount = 0;
  
  for (const post of posts) {
    if (post.lang === 'en' && post.content.length < 1500) {
      console.log(`\nPost ${post.id} "${post.title}" looks suspiciously short (${post.content.length} chars). Attempting to recover from WP...`);
      
      const shortTitle = post.title.split(' ').slice(0, 4).join(' ');
      const searchUrl = `https://dholerahub.com/wp-json/wp/v2/posts?search=${encodeURIComponent(shortTitle)}`;
      const wpPosts = await fetchJson(searchUrl);
      
      if (wpPosts.length > 0) {
        let content = wpPosts[0].content.rendered;
        console.log(`Found original content! Length: ${content.length}`);
        
        // SAFE REGEX REMOVAL
        content = content.replace(/<div class="mt-8 rounded-2xl bg-slate-50[^]*?Contact Us Now<\/a>[\s\S]*?<\/div>/g, '');
        content = content.replace(/<div class="mt-8 rounded-2xl bg-slate-50[^]*?<\/div>/g, '');
        content = content.replace(/<p[^>]*>.*?(?:7435808031|dholerahub\.com|Contact us today|Call\/WhatsApp).*?<\/p>/gi, '');
        content = content.replace(/<p[^>]*>[^<]*?(?:7435808031|dholerahub\.com|Contact us today|Call\/WhatsApp)[^<]*?<\/p>/gi, '');
        
        const newContactBlock = `\n<p class="wp-block-paragraph">📞 Call/WhatsApp: <a href="https://wa.me/917435808031" target="_blank" rel="noopener noreferrer"><strong>+91 7435808031</strong></a></p>\n<p class="wp-block-paragraph">🌐 Website: <a href="https://dholeraplatform.com/contact"><strong>https://dholeraplatform.com/contact</strong></a></p>\n<p class="wp-block-paragraph">Contact us today to discuss your requirements and discover the best land investment opportunities in Dholera SIR.</p>`;
        
        if (!content.includes('href="https://dholeraplatform.com/contact"')) {
          content = content + newContactBlock;
        }
        
        try {
          await sendRecoveryRequest(post.id, content, 'en');
          console.log(`Recovered POST ${post.id} via WP API!`);
          recoveredCount++;
        } catch (err) {
          console.error(`Failed to recover POST ${post.id}:`, err.message);
        }
      } else {
        console.log(`Could not find post "${post.title}" in WP API.`);
      }
    }
  }
  
  console.log(`\nFinished recovering ${recoveredCount} missing posts from WP API!`);
  
  if (recoveredCount > 0) {
    console.log('Triggering background translations for new content...');
    await fetchJson('https://api.dholeraplatform.com/api/updates?lang=hi');
    await fetchJson('https://api.dholeraplatform.com/api/updates?lang=gu');
    console.log('Translations triggered!');
  }
}

run().catch(console.error);
