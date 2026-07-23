const fs = require('fs');
const axios = require('axios');

function mergeSetCookieHeaders(setCookieHeaders = [], existing = '') {
  const cookies = new Map();
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
  return Array.from(cookies.entries()).map(([k, v]) => k + '=' + v).join('; ');
}

async function run() {
    try {
        const filePath = 'c:/Desktop/JR/Dholera/blogs/Week2_Blog6.md';
        const content = fs.readFileSync(filePath, 'utf8');

        const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
        const metaStr = match[1];
        let meta = {};
        metaStr.split('\n').forEach(line => {
            if (!line.includes(':')) return;
            const [key, ...rest] = line.split(':');
            let value = rest.join(':').trim();
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            meta[key.trim()] = value;
        });

        const body = content.slice(match[0].length);
        let htmlContent = body
            .replace(/^#\s+(.*)$/gm, '<h1>$1</h1>')
            .replace(/^##\s+(.*)$/gm, '<h2>$1</h2>')
            .replace(/^###\s+(.*)$/gm, '<h3>$1</h3>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n\n/g, '<br><br>');

        const API_URL = 'https://api.dholeraplatform.com';
        let cookieJar = '';
        
        console.log('Fetching CSRF...');
        const csrfRes = await axios.get(API_URL + '/api/auth/csrf-token', { validateStatus: () => true, timeout: 15000 });
        cookieJar = mergeSetCookieHeaders(csrfRes.headers['set-cookie'] || [], cookieJar);
        const csrfToken = csrfRes.data.csrfToken;
        
        console.log('Logging in...');
        const loginRes = await axios.post(API_URL + '/api/auth/login', { username: 'admin', password: 'change-me' }, {
            headers: { 'X-CSRF-Token': csrfToken, 'Cookie': cookieJar },
            validateStatus: () => true
        });
        
        cookieJar = mergeSetCookieHeaders(loginRes.headers['set-cookie'] || [], cookieJar);
        const token = loginRes.data.token;
        
        console.log('Refresh CSRF...');
        const csrfAfter = await axios.get(API_URL + '/api/auth/csrf-token', { headers: { Cookie: cookieJar }, validateStatus: () => true, timeout: 15000 });
        if (csrfAfter.status === 200 && csrfAfter.data?.csrfToken) {
            cookieJar = mergeSetCookieHeaders(csrfAfter.headers['set-cookie'] || [], cookieJar);
        }
        const finalCsrf = csrfAfter.data?.csrfToken || csrfToken;
        
        console.log('Posting blog...');
        const res = await axios.post(API_URL + '/api/updates', {
            title: meta.title || meta.meta_title || 'Week2 Blog6',
            content: htmlContent,
            category: meta.category || 'Investment',
            published: true,
            imageUrl: '/uploads/dholera_blog_image.png',
            imagePosition: 'top',
            author: 'Dholera Admin'
        }, {
            headers: {
                Authorization: 'Bearer ' + token,
                'X-CSRF-Token': finalCsrf,
                Cookie: cookieJar,
                'Content-Type': 'application/json'
            },
            validateStatus: () => true
        });
        
        if (res.status >= 200 && res.status < 300) {
            console.log('Success ID:', res.data.id);
            const newContent = content.replace(/^published: .*/m, 'published: "true"');
            fs.writeFileSync(filePath, newContent, 'utf8');
        } else {
            console.error('Failed:', res.status, res.data);
        }
    } catch (e) {
        console.error('Error:', e.message);
    }
}
run();
