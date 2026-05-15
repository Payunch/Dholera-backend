/**
 * seed_blog_startup.js
 *
 * Automatically seeds 5 premium investment articles on startup if not present.
 * Also generates automated translations in Hindi (hi) and Gujarati (gu).
 */

const { getPremiumBlogPosts } = require('../utils/discoverDholeraPost');
const { Update } = require('../models');
const { translateBlogPost } = require('../services/translationService');

async function seedBlogIfEmpty() {
  try {
    const englishPosts = getPremiumBlogPosts();
    
    for (const post of englishPosts) {
      // 1. Ensure English version exists
      let existingEn = await Update.findOne({ 
        where: { title: post.title } 
      });

      if (!existingEn) {
        existingEn = await Update.create(post);
        console.log(`[Seed] Seeded English: ${post.title}`);
      }

      // 2. Ensure translations exist
      // We check for translations by target language codes.
      // Note: This relies on the translation service returning predictable titles.
      const targetLangs = ['hi', 'gu'];
      
      for (const lang of targetLangs) {
        // Simple check: does any post with this category exist that looks like a translation?
        // A better check would be title-based, but translation titles vary.
        // For startup speed, we only generate if we don't find a significant number of posts.
        // Actually, let's just do a specific title check after one-time translation.
      }

      // To keep it simple and avoid too many API calls, we'll only translate 
      // if the total count of updates is less than (posts.length * 3)
    }

    const totalCount = await Update.count();
    const expectedCount = englishPosts.length * 3;

    if (totalCount < expectedCount) {
      console.log(`[Seed] Current posts: ${totalCount}/${expectedCount}. Generating missing translations...`);
      for (const post of englishPosts) {
        const translations = await translateBlogPost(post, ['hi', 'gu']);
        for (const t of translations) {
          const existingT = await Update.findOne({ where: { title: t.title } });
          if (!existingT) {
            await Update.create(t);
            console.log(`[Seed] Seeded Translation: ${t.title}`);
          }
        }
      }
    } else {
      console.log('[Seed] Blog and translations are already fully seeded.');
    }
  } catch (err) {
    console.error('[Seed] Failed to auto-seed blog posts:', err.message);
  }
}

module.exports = { seedBlogIfEmpty };
