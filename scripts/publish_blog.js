#!/usr/bin/env node
// Publish a single blog post to the backend using admin credentials from .env
// Usage:
//   node scripts/publish_blog.js
//   API_URL=https://api.dholeraplatform.com node scripts/publish_blog.js

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const axios = require('axios');

const API_URL = process.env.API_URL || `http://localhost:${process.env.PORT || 3001}`;
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';

const CONTENT = `Real estate has always been one of the strongest wealth-building assets across generations. While stocks and digital investments may fluctuate rapidly, land and property continue to offer stability, long-term appreciation, and tangible ownership. Today, investors are not only looking at metro cities but are also exploring emerging regions that show future growth potential and infrastructure development.

One of the key reasons real estate remains attractive is because land is limited while demand keeps increasing. As cities expand and industries grow, nearby regions begin to transform into investment hotspots. Investors who identify these locations early often benefit the most in terms of appreciation and returns.

Modern investors are now focusing on projects that combine strategic location, future infrastructure, legal clarity, and long-term development opportunities. Whether it is residential plotting, commercial expansion, or smart city development, the right investment can create financial security for years to come.

Another major advantage of real estate investment is diversification. Unlike volatile assets, property investments can provide consistent value growth while also serving as a physical asset that can be used, rented, or resold in the future. This makes it a preferred choice for both experienced investors and first-time buyers.

Infrastructure plays a crucial role in determining the future value of any property. Areas connected with highways, industrial corridors, smart city planning, airports, and logistics hubs often witness faster appreciation. Investors who study government development plans and upcoming projects are usually able to make more informed decisions.

In recent years, professionally managed real estate companies have made property investment easier and more transparent for buyers. Investors now prefer companies that offer clear documentation, proper customer support, and projects located in high-potential regions.

Among such growing names in the sector is Deep Buildwell, a company focused on delivering reliable real estate opportunities with a customer-centric approach. Their focus on strategic locations and planned developments reflects the changing expectations of modern property investors.

For anyone planning to build long-term wealth, real estate continues to remain one of the most dependable investment options. The key lies in selecting the right location, understanding future growth potential, and partnering with trustworthy developers who value transparency and quality.

As urban development continues to reshape India’s economic landscape, emerging real estate destinations are expected to create significant opportunities for investors who act early and think long term.`;

// Helper to parse Set-Cookie headers into a cookie string
function mergeSetCookieHeaders(setCookieHeaders = [], existing = '') {
  const cookies = new Map();

  // Load existing cookies
  if (existing) {
    existing.split(';').map(s => s.trim()).filter(Boolean).forEach(pair => {
      const [k, v] = pair.split('=');
      cookies.set(k, v || '');
    });
  }

  for (const header of setCookieHeaders) {
    const pair = header.split(';')[0].trim();
    const idx = pair.indexOf('=');
    if (idx > 0) {
      const k = pair.slice(0, idx);
      const v = pair.slice(idx + 1);
      cookies.set(k, v);
    }
  }

  return Array.from(cookies.entries()).map(([k, v]) => `${k}=${v}`).join('; ');
}

async function main() {
  try {
    console.log('Preparing session and CSRF token at', API_URL);

    let cookieJar = '';

    // 1) Fetch CSRF token (establishes session cookie)
    const csrfRes = await axios.get(`${API_URL}/api/auth/csrf-token`, {
      validateStatus: () => true,
      timeout: 10000
    });

    if (csrfRes.status !== 200 || !csrfRes.data?.csrfToken) {
      console.error('Failed to fetch CSRF token:', csrfRes.status, csrfRes.data);
      process.exit(1);
    }

    cookieJar = mergeSetCookieHeaders(csrfRes.headers['set-cookie'] || [], cookieJar);
    const csrfToken = csrfRes.data.csrfToken;
    console.log('Fetched CSRF token.');

    // 2) Login using CSRF token and session cookie
    console.log('Logging in as admin...');
    const loginRes = await axios.post(`${API_URL}/api/auth/login`, {
      username: ADMIN_USER,
      password: ADMIN_PASS
    }, {
      headers: {
        'X-CSRF-Token': csrfToken,
        Cookie: cookieJar
      },
      validateStatus: () => true,
      timeout: 10000
    });

    cookieJar = mergeSetCookieHeaders(loginRes.headers['set-cookie'] || [], cookieJar);

    if (loginRes.status !== 200 || !loginRes.data?.token) {
      console.error('Login failed:', loginRes.status, loginRes.data);
      process.exit(1);
    }

    const token = loginRes.data.token;
    console.log('Authenticated. Obtained access token.');

    // 3) Refresh CSRF token (after session established) to use for protected mutation
    const csrfAfter = await axios.get(`${API_URL}/api/auth/csrf-token`, {
      headers: { Cookie: cookieJar },
      validateStatus: () => true,
      timeout: 10000
    });
    if (csrfAfter.status === 200 && csrfAfter.data?.csrfToken) {
      cookieJar = mergeSetCookieHeaders(csrfAfter.headers['set-cookie'] || [], cookieJar);
    }
    const csrfForMutations = csrfAfter.data?.csrfToken || csrfToken;

    console.log('Posting blog update...');

    const payload = {
      title: 'Why Smart Investors Are Turning Toward Emerging Real Estate Markets',
      category: 'Investment',
      content: CONTENT,
      published: true,
      imageUrl: 'https://images.unsplash.com/photo-1509391366360-fe5bb58485bb?q=80&w=2070&auto=format&fit=crop'
    };

    const postRes = await axios.post(`${API_URL}/api/updates`, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        'X-CSRF-Token': csrfForMutations,
        Cookie: cookieJar,
        'Content-Type': 'application/json'
      },
      validateStatus: () => true,
      timeout: 10000
    });

    if (postRes.status >= 200 && postRes.status < 300) {
      console.log('Blog posted successfully:', postRes.data.id ? `id=${postRes.data.id}` : postRes.data);
    } else {
      console.error('Failed to post blog:', postRes.status, postRes.data);
      process.exitCode = 1;
    }
  } catch (err) {
    console.error('Error publishing blog:', err.response ? err.response.data : err.message);
    process.exitCode = 1;
  }
}

main();
