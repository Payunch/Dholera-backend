const { Update } = require('../models');
const { getDiscoverDholeraPayload } = require('../utils/discoverDholeraPost');

async function seedBlog() {
  try {
    const payload = getDiscoverDholeraPayload();

    const legacyTitles = [
      "Discover Dholera: India's First Greenfield Smart City",
      'Discover Dholera: India’s First Greenfield Smart City',
    ];

    const existingRows = await Update.findAll({ where: { title: legacyTitles } });

    if (existingRows.length > 0) {
      for (const row of existingRows) {
        await row.update(payload);
      }
      console.log(`Blog post updated successfully (${existingRows.length} record(s)).`);
    } else {
      await Update.create(payload);
      console.log('Blog post seeded successfully!');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error seeding blog:', error);
    process.exit(1);
  }
}

seedBlog();
