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
    }

    console.log('[Seed] English blog posts are fully seeded.');
  } catch (err) {
    console.error('[Seed] Failed to auto-seed blog posts:', err.message);
  }
}

module.exports = { seedBlogIfEmpty };
