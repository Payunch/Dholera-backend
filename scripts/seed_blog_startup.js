/**
 * seed_blog_startup.js
 *
 * Automatically seeds 5 premium investment articles on startup if not present.
 * This ensures high-quality content is always available even if the database 
 * is wiped due to ephemeral storage (no persistent volume).
 */

const { getPremiumBlogPosts } = require('../utils/discoverDholeraPost');
const { Update } = require('../models');

async function seedBlogIfEmpty() {
  try {
    const payloads = getPremiumBlogPosts();
    
    for (const payload of payloads) {
      const existing = await Update.findOne({ 
        where: { title: payload.title } 
      });

      if (!existing) {
        await Update.create(payload);
        console.log(`[Seed] Auto-seeded: ${payload.title}`);
      }
    }
  } catch (err) {
    console.error('[Seed] Failed to auto-seed blog posts:', err.message);
  }
}

module.exports = { seedBlogIfEmpty };
