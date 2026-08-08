const axios = require('axios');
const fs = require('fs');
const path = require('path');

const LIVE_API_BASE_URL = (process.env.LIVE_API_BASE_URL || 'https://api.dholeraplatform.com/api').replace(/\/+$/, '');

function appendField(form, name, value) {
  if (value !== undefined && value !== null) form.append(name, String(value));
}

/** Copies one locally generated draft, including its chosen local image, to production. */
async function publishDraftToLive(update) {
  if (!process.env.ADMIN_USER || !process.env.ADMIN_PASS) {
    throw new Error('ADMIN_USER and ADMIN_PASS are required for the live blog sync.');
  }

  const blog = typeof update.toJSON === 'function' ? update.toJSON() : update;
  const api = axios.create({ baseURL: LIVE_API_BASE_URL, timeout: 60000 });
  const matches = await api.get('/updates', { params: { all: 'true', search: blog.title } });
  const existing = Array.isArray(matches.data) && matches.data.find(post => post.title === blog.title);
  if (existing) return { id: existing.id, alreadyExists: true };

  const login = await api.post('/auth/login', {
    username: process.env.ADMIN_USER,
    password: process.env.ADMIN_PASS
  });
  if (!login.data?.token) throw new Error('Production login did not return an access token.');

  const form = new FormData();
  appendField(form, 'title', blog.title);
  appendField(form, 'content', blog.content);
  appendField(form, 'category', blog.category);
  appendField(form, 'published', false);
  appendField(form, 'imagePosition', blog.imagePosition || 'top');
  appendField(form, 'publishedAt', blog.publishedAt || new Date().toISOString());
  appendField(form, 'author', blog.author || 'Auto-Blogger AI');
  appendField(form, 'tags', blog.tags);
  appendField(form, 'seoTitle', blog.seoTitle);
  appendField(form, 'seoDescription', blog.seoDescription);
  appendField(form, 'seoKeywords', blog.seoKeywords);

  const filename = blog.imageUrl ? path.basename(blog.imageUrl) : null;
  const localImagePath = filename ? path.join(__dirname, '..', 'uploads', 'images', filename) : null;
  if (localImagePath && fs.existsSync(localImagePath)) {
    const image = fs.readFileSync(localImagePath);
    form.append('image', new Blob([image], { type: 'image/jpeg' }), filename);
  } else {
    appendField(form, 'imageUrl', blog.imageUrl);
  }

  const created = await api.post('/updates', form, {
    headers: { Authorization: `Bearer ${login.data.token}` }
  });
  return { id: created.data.id, alreadyExists: false, imageUrl: created.data.imageUrl };
}

module.exports = { publishDraftToLive };
