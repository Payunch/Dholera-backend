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
      // 1. Seed English version if missing
      const existingEn = await Update.findOne({ 
        where: { title: post.title } 
      });

      if (!existingEn) {
        await Update.create(post);
        console.log(`[Seed] Seeded English: ${post.title}`);
        
        // 2. Generate and seed translations
        // We only translate when first creating the English post to avoid 
        // redundant API calls on every startup.
        const translations = await translateBlogPost(post, ['hi', 'gu']);
        for (const t of translations) {
          // Check if this translation already exists (though unlikely if EN is new)
          const existingT = await Update.findOne({ where: { title: t.title } });
          if (!existingT) {
            await Update.create(t);
            console.log(`[Seed] Seeded Translation: ${t.title}`);
          }
        }
      }
    }
  } catch (err) {
    console.error('[Seed] Failed to auto-seed blog posts:', err.message);
  }
}

module.exports = { seedBlogIfEmpty };
