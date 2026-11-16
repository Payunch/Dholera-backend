const { Update } = require('../models');
const https = require('https');
const http = require('http');

function checkUrl(url) {
  return new Promise((resolve) => {
    try {
      const client = url.startsWith('https') ? https : http;
      const req = client.request(url, { method: 'HEAD', timeout: 5000 }, (res) => {
        resolve({ url, status: res.statusCode });
      });
      req.on('error', (err) => resolve({ url, status: 0, error: err.message }));
      req.on('timeout', () => { req.destroy(); resolve({ url, status: 408 }); });
      req.end();
    } catch (e) {
      resolve({ url, status: 0, error: e.message });
    }
  });
}

async function main() {
  const posts = await Update.findAll({ order: [['id', 'ASC']] });
  console.log(`Checking images across ${posts.length} posts...`);

  const broken = [];
  for (const p of posts) {
    let img = p.imageUrl;
    if (!img) {
      // Check content
      const m = p.content ? p.content.match(/<img[^>]+src=["']([^"']+)["']/i) : null;
      if (m) img = m[1];
    }

    if (!img) {
      broken.push({ id: p.id, title: p.title.slice(0, 40), reason: 'NO_IMAGE_DEFINED', url: null });
      continue;
    }

    let fullUrl = img;
    if (img.startsWith('/uploads/')) {
      fullUrl = `https://api.dholeraplatform.com${img}`;
    } else if (img.startsWith('/')) {
      fullUrl = `https://www.dholeraplatform.com${img}`;
    }

    const res = await checkUrl(fullUrl);
    if (res.status !== 200) {
      broken.push({ id: p.id, title: p.title.slice(0, 40), reason: `HTTP_${res.status}`, url: fullUrl });
    }
  }

  console.log(`\nFound ${broken.length} posts with broken or missing images:`);
  for (const b of broken) {
    console.log(`- ID ${b.id}: [${b.reason}] ${b.title} -> ${b.url}`);
  }
}

main().catch(console.error);
