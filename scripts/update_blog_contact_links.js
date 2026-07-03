const { Update } = require('../models');
const sequelize = require('../config/database');

async function run() {
  await sequelize.authenticate();
  const updates = await Update.findAll();
  
  let count = 0;
  for (const update of updates) {
    let content = update.content;
    let modified = false;
    
    // Check if the content has the old banner or contact text
    if (content.includes('Want to learn more about Dholera?') || content.includes('Contact Us Now') || content.includes('7435808031') || content.includes('dholerahub.com/contact') || content.includes('Contact us today')) {
      
      // Remove my custom banner
      content = content.replace(/<div class="mt-8 rounded-2xl bg-slate-50[^]*?Contact Us Now<\/a>[\s\S]*?<\/div>/g, '');
      content = content.replace(/<div class="mt-8 rounded-2xl bg-slate-50[^]*?<\/div>/g, '');
      
      // Remove any leftover old text blocks
      content = content.replace(/<p[^>]*>[\s\S]*?(?:7435808031|dholerahub\.com|Contact us today|Call\/WhatsApp)[\s\S]*?<\/p>/gi, '');
      content = content.replace(/📞[\s\S]*?7435808031/g, '');
      content = content.replace(/🌐[\s\S]*?dholerahub\.com/g, '');
      content = content.replace(/Contact us today[\s\S]*?Dholera SIR\./gi, '');
      
      const newContactBlock = `
<p class="wp-block-paragraph">📞 Call/WhatsApp: <a href="https://wa.me/917435808031" target="_blank" rel="noopener noreferrer"><strong>7435808031</strong></a></p>
<p class="wp-block-paragraph">🌐 Website: <a href="https://dholeraplatform.com/contact"><strong>https://dholeraplatform.com/contact</strong></a></p>
<p class="wp-block-paragraph">Contact us today to discuss your requirements and discover the best land investment opportunities in Dholera SIR.</p>`;
      
      if (!content.includes('href="https://dholeraplatform.com/contact"')) {
        content = content + newContactBlock;
      }
      modified = true;
    }
    
    if (modified) {
      update.content = content.trim();
      await update.save();
      count++;
      console.log(`Updated post: ${update.title}`);
    }
  }
  
  console.log(`Successfully replaced contact links in ${count} posts.`);
  process.exit(0);
}

run().catch(console.error);
