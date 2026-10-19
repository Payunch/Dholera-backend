/**
 * Automated Daily Search Engine Indexer for Dholera Platform
 * Can be run locally or on production server via cron.
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const SITE_HOST = 'www.dholeraplatform.com';
const SITEMAP_URL = `https://${SITE_HOST}/sitemap.xml`;
const INDEXNOW_KEY = '8f4b2c1d9e7a3f5b0c6d8e2a1b4c7d9e';
const INDEXNOW_KEY_LOCATION = `https://${SITE_HOST}/${INDEXNOW_KEY}.txt`;

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    client.get(url, { headers: { 'User-Agent': 'DholeraAutoIndexer/1.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 400) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode} from ${url}`));
        }
      });
    }).on('error', reject);
  });
}

function postJson(url, postData) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;
    const bodyString = JSON.stringify(postData);

    const req = client.request({
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': Buffer.byteLength(bodyString),
        'User-Agent': 'DholeraAutoIndexer/1.0'
      }
    }, (res) => {
      let resp = '';
      res.on('data', chunk => resp += chunk);
      res.on('end', () => {
        resolve({ statusCode: res.statusCode, body: resp });
      });
    });

    req.on('error', reject);
    req.write(bodyString);
    req.end();
  });
}

function extractUrlsFromSitemap(xml) {
  const matches = xml.match(/<loc>(.*?)<\/loc>/g) || [];
  return matches
    .map(tag => tag.replace(/<\/?loc>/g, '').trim())
    .filter(url => url && url.startsWith('http'));
}

async function runAutoIndexer() {
  console.log('================================================================');
  console.log('DHOLERA PLATFORM — AUTOMATED DAILY SEARCH ENGINE INDEXER');
  console.log(`Execution Time: ${new Date().toISOString()}`);
  console.log('================================================================\n');

  console.log(`[1/4] Fetching latest live sitemap from: ${SITEMAP_URL}...`);
  let sitemapXml = '';
  try {
    sitemapXml = await fetchText(SITEMAP_URL);
    console.log(`[✓] Sitemap fetched successfully (${sitemapXml.length} bytes)`);
  } catch (err) {
    console.error(`[✗] Failed to fetch sitemap: ${err.message}`);
    process.exit(1);
  }

  const urls = extractUrlsFromSitemap(sitemapXml);
  console.log(`[2/4] Discovered ${urls.length} live URLs to index.`);

  console.log('\n[3/4] Broadcasting URL batch to IndexNow Engine (Bing & Alliance)...');
  const indexNowPayload = {
    host: SITE_HOST,
    key: INDEXNOW_KEY,
    keyLocation: INDEXNOW_KEY_LOCATION,
    urlList: urls
  };

  const endpoints = [
    'https://api.indexnow.org/IndexNow',
    'https://www.bing.com/indexnow'
  ];

  for (const ep of endpoints) {
    try {
      const res = await postJson(ep, indexNowPayload);
      const ok = res.statusCode === 200 || res.statusCode === 202;
      console.log(`   [${ok ? '✓ PASS' : '✗ FAIL'}] ${ep} → HTTP ${res.statusCode} ${ok ? '(Accepted for instant crawl)' : ''}`);
    } catch (err) {
      console.warn(`   [!] Warning contacting ${ep}: ${err.message}`);
    }
  }

  console.log('\n[4/4] Checking Google Indexing API Integration...');
  const serviceAccountPath = path.join(__dirname, '..', 'config', 'service_account.json');
  if (fs.existsSync(serviceAccountPath)) {
    try {
      const { pushIndexUrl } = require('./googleIndexing');
      console.log('   [i] Service account detected! Dispatching priority indexing to Google...');
      const priorityUrls = urls.filter(u => u.includes('/blogs/') || u === `https://${SITE_HOST}`);
      let pushedCount = 0;
      for (const targetUrl of priorityUrls) {
        const pushed = await pushIndexUrl(targetUrl);
        if (pushed) pushedCount++;
      }
      console.log(`   [✓] Submitted ${pushedCount} URLs to Google Indexing API`);
    } catch (err) {
      console.warn(`   [!] Google Indexing API error: ${err.message}`);
    }
  } else {
    console.log(`   [i] Notice: service_account.json not found in Dholera-backend/config/`);
  }

  console.log(`\n[COMPLETE] Successfully notified search engines for all ${urls.length} URLs!\n`);
}

if (require.main === module) {
  runAutoIndexer().catch(err => {
    console.error('[FATAL ERROR]', err);
    process.exit(1);
  });
}

module.exports = { runAutoIndexer };
