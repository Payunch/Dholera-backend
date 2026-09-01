const assert = require('node:assert/strict');
const { isNearDuplicateTitle, normalizeInternalLinks, validateGeneratedBlog } = require('../services/autoBlogEditorialPolicy');

describe('auto-blog editorial policy', () => {
  it('detects rewritten versions of the same topic', () => {
    assert.equal(isNearDuplicateTitle('Dholera Airport construction progress update 2026', ['Construction progress at Dholera Airport: latest update']), true);
  });

  it('normalizes owned-domain and legacy blog links', () => {
    const result = normalizeInternalLinks('<a href="https://dholeraplatform.com/infrastructure">A</a><a href="/blog/test">B</a>');
    assert.match(result, /https:\/\/www\.dholeraplatform\.com\/infrastructure/);
    assert.match(result, /href="\/blogs\/test"/);
  });

  it('rejects placeholders and missing source attribution', () => {
    const result = validateGeneratedBlog({
      title: 'A sufficiently descriptive Dholera development headline',
      seoTitle: 'Dholera Development News and Project Context',
      seoDescription: 'A detailed explanation of a recent Dholera development, its confirmed context, and the points readers should verify before decisions.',
      content: '<h2>What happened</h2><p>Contact +91-XXXXXXXXXX for details.</p>'
    }, { sourceUrl: 'https://news.example.org/story' });
    assert.equal(result.valid, false);
    assert.ok(result.errors.some(error => error.includes('source')));
    assert.ok(result.errors.some(error => error.includes('placeholder')));
  });
});
