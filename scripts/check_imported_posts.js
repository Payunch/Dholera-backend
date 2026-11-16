const { sequelize } = require('../models');

async function checkAllImportedPosts() {
  try {
    const [rows] = await sequelize.query("SELECT id, title, slug, imageUrl, createdAt, updatedAt, original_id, portal_id FROM Updates ORDER BY id ASC");
    console.log(`Total rows in Updates: ${rows.length}`);

    // Check each post for WordPress/Elementor or dholerahub indicators
    for (const r of rows) {
      const [full] = await sequelize.query(`SELECT content, content_gu, content_hi, imageUrl FROM Updates WHERE id = ${r.id}`);
      const c = full[0];
      const allText = `${c.content || ''} ${c.content_gu || ''} ${c.content_hi || ''} ${c.imageUrl || ''}`;
      
      const hasDholeraHub = allText.toLowerCase().includes('dholerahub');
      const hasWpContent = allText.includes('wp-content');
      const hasElementor = allText.includes('elementor');
      
      if (hasDholeraHub || hasWpContent || hasElementor || (r.id >= 45 && r.id <= 70)) {
        console.log(`ID ${r.id}: "${r.title}" | dholerahub: ${hasDholeraHub} | wp-content: ${hasWpContent} | elementor: ${hasElementor} | original_id: ${r.original_id}`);
      }
    }
  } catch (err) {
    console.error(err);
  } finally {
    await sequelize.close();
  }
}

checkAllImportedPosts();
