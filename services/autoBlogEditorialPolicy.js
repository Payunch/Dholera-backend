const SITE_ORIGIN = 'https://www.dholeraplatform.com';

const EVERGREEN_PATHS = [
  '/smart-city', '/infrastructure', '/airport', '/investment-guide',
  '/tp-maps', '/clearance-engine', '/blogs'
];

function plainText(html = '') {
  return String(html).replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&amp;|&quot;|&#39;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function normalizeTitle(value = '') {
  return String(value).toLowerCase()
    .replace(/\b(?:dholera|smart|city|news|update|latest|202\d)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

function titleSimilarity(first, second) {
  const left = new Set(normalizeTitle(first).split(/\s+/).filter(Boolean));
  const right = new Set(normalizeTitle(second).split(/\s+/).filter(Boolean));
  if (!left.size || !right.size) return 0;
  const intersection = [...left].filter(token => right.has(token)).length;
  return intersection / new Set([...left, ...right]).size;
}

function isNearDuplicateTitle(candidate, existingTitles = [], threshold = 0.72) {
  return existingTitles.some(title => titleSimilarity(candidate, title) >= threshold);
}

function extractHrefs(html = '') {
  return [...String(html).matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)]
    .map(match => match[1].trim());
}

function normalizeInternalLinks(html = '') {
  return String(html)
    .replace(/https?:\/\/(?:www\.)?dholeraplatform\.com(?=\/|["'])/gi, SITE_ORIGIN)
    .replace(/href=["']\/blog\//gi, 'href="/blogs/');
}

function validateGeneratedBlog(blog, { sourceUrl, contentMode = 'web' } = {}) {
  const errors = [];
  const isApp = contentMode === 'app';
  const title = String(blog?.title || '').trim();
  const seoTitle = String(blog?.seoTitle || '').trim();
  const description = String(blog?.seoDescription || '').trim();
  const content = String(blog?.content || '').trim();
  const text = plainText(content);
  const wordCount = text ? text.split(/\s+/).length : 0;
  const hrefs = extractHrefs(content);
  const internalLinks = hrefs.filter(href => {
    try {
      const url = new URL(href, SITE_ORIGIN);
      return url.origin === SITE_ORIGIN && EVERGREEN_PATHS.some(path => url.pathname === path || url.pathname.startsWith(`${path}/`));
    } catch (_) { return false; }
  });

  if (title.length < 25 || title.length > 110) errors.push('Article title must be 25-110 characters.');
  if (seoTitle.length < 35 || seoTitle.length > 60) errors.push('SEO title must be 35-60 characters.');
  if (description.length < 120 || description.length > 160) errors.push('SEO description must be 120-160 characters.');
  if (isApp ? wordCount < 140 || wordCount > 350 : wordCount < 650 || wordCount > 1400) {
    errors.push(isApp ? 'App brief must be 140-350 words.' : 'Web article must be 650-1,400 words.');
  }
  const normalizedSourceUrl = String(sourceUrl || '').replace(/&amp;/gi, '&');
  if (!normalizedSourceUrl || !hrefs.some(href => href.replace(/&amp;/gi, '&') === normalizedSourceUrl)) errors.push('Article must link to the supplied news source.');
  if (!isApp && internalLinks.length < 2) errors.push('Web article must contain at least two valid evergreen internal links.');
  if (/(?:XXXXXXXXXX|example\.com|insert\s+(?:link|source)|\[Source Name\]|href=["']\/blog\/)/i.test(`${content} ${seoTitle} ${description}`)) errors.push('Article contains a placeholder or invalid /blog/ link.');
  if (/<(?:script|iframe|object|embed)\b/i.test(content)) errors.push('Generated content contains an unsafe embedded element.');
  if (/<h1\b/i.test(content)) errors.push('Article body must not contain an H1; the page title supplies it.');
  if (!isApp && !/<h2\b/i.test(content)) errors.push('Web article must contain descriptive H2 sections.');

  return { valid: errors.length === 0, errors, wordCount, internalLinkCount: internalLinks.length };
}

module.exports = { EVERGREEN_PATHS, SITE_ORIGIN, isNearDuplicateTitle, normalizeInternalLinks, normalizeTitle, titleSimilarity, validateGeneratedBlog };
