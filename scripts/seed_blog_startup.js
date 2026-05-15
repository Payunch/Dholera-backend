/**
 * seed_blog_startup.js
 *
 * Automatically seeds the "Discover Dholera" blog post on startup if not present.
 * This ensures the content is always available even if the database is wiped
 * due to ephemeral storage (no persistent volume).
 */

const { getDiscoverDholeraPayload } = require('../utils/discoverDholeraPost');
const { Update } = require('../models');

async function seedBlogIfEmpty() {
  try {
    const payload = getDiscoverDholeraPayload();
    const legacyTitles = [
      "Discover Dholera: India's First Greenfield Smart City",
      "Discover Dholera: India’s First Greenfield Smart City",
      payload.title
    ];

    const existingRows = await Update.count({ 
      where: { 
        title: legacyTitles
      } 
    });

    if (existingRows === 0) {
      await Update.create(payload);
      console.log('[Seed] Auto-seeded Discover Dholera blog post.');
    } else {
      console.log('[Seed] Discover Dholera blog post already exists.');
    }
  } catch (err) {
    console.error('[Seed] Failed to auto-seed blog post:', err.message);
  }
}

module.exports = { seedBlogIfEmpty };
