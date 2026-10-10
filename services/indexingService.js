const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { pushIndexUrl } = require('../scripts/googleIndexing');

const BASE_URL = process.env.FRONTEND_URL || 'https://www.dholeraplatform.com';
const SITEMAP_URL = `${BASE_URL}/sitemap.xml`;

/**
 * Cleanly format blog slug from update record
 */
function getSlugString(update) {
  if (update.slug && update.slug.trim()) {
    return update.slug.trim();
  }
  return (update.title || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

/**
 * Ping search engines (Google, Bing, IndexNow) when content is published or updated.
 * Non-blocking: will never crash the calling controller.
 */
async function notifySearchEngines(update) {
  if (!update) return;

  const slug = getSlugString(update);
  const targetUrl = `${BASE_URL}/blogs/${slug}`;

  console.log(`[IndexingService] Dispatching indexing pings for: ${targetUrl}`);

  const results = {
    url: targetUrl,
    googleIndexingApi: false,
    googleSitemapPing: false,
    indexNowPing: false,
  };

  // 1. Google Indexing API (Service Account)
  try {
    const pushed = await pushIndexUrl(targetUrl);
    results.googleIndexingApi = Boolean(pushed);
  } catch (err) {
    console.warn('[IndexingService] Google Indexing API skipped/failed:', err.message);
  }

  // 2. Google Sitemap Ping
  try {
    const sitemapPingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(SITEMAP_URL)}`;
    const res = await axios.get(sitemapPingUrl, { timeout: 7000 });
    results.googleSitemapPing = res.status >= 200 && res.status < 400;
    console.log(`[IndexingService] Google Sitemap Ping status: ${res.status}`);
  } catch (err) {
    // Google Sitemap Ping might return 404 or deprecation headers on some networks, log cleanly
    console.log('[IndexingService] Google Sitemap Ping response/skipped:', err.message);
  }

  // 3. IndexNow API (Supported by Bing, Yandex, Seznam, Naver)
  try {
    const indexNowUrl = `https://api.indexnow.org/indexnow?url=${encodeURIComponent(targetUrl)}&key=dholeraplatform`;
    const res = await axios.get(indexNowUrl, { timeout: 7000 });
    results.indexNowPing = res.status >= 200 && res.status < 400;
    console.log(`[IndexingService] IndexNow Ping status: ${res.status}`);
  } catch (err) {
    console.log('[IndexingService] IndexNow Ping response/skipped:', err.message);
  }

  return results;
}

module.exports = {
  notifySearchEngines,
  getSlugString,
};
