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
        where: { title: post.title, lang: 'en' } 
      });

      if (!existingEn) {
        existingEn = await Update.create({ ...post, lang: 'en' });
        console.log(`[Seed] Seeded English: ${post.title}`);
      }

      // 2. Generate and seed translations if missing
      const translations = await translateBlogPost(post, ['hi', 'gu']);
      
      for (let i = 0; i < translations.length; i++) {
        const translatedPayload = translations[i];
        const langCode = i === 0 ? 'hi' : 'gu';
        
        const existingTrans = await Update.findOne({
          where: { original_id: existingEn.id, lang: langCode }
        });

        if (!existingTrans) {
          await Update.create({
            ...translatedPayload,
            lang: langCode,
            original_id: existingEn.id
          });
          console.log(`[Seed] Seeded ${langCode.toUpperCase()} for: ${post.title}`);
        }
      }
    }

    console.log('[Seed] English blog posts are fully seeded.');
  } catch (err) {
    console.error('[Seed] Failed to auto-seed blog posts:', err.message);
  }
}

module.exports = { seedBlogIfEmpty };
