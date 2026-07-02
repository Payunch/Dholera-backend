const { Update } = require('../models');
const sequelize = require('../config/database');

async function run() {
  await sequelize.authenticate();
  const updates = await Update.findAll();
  
  let count = 0;
  for (const update of updates) {
    let content = update.content;
    let modified = false;
    
    if (content.includes('dholerahub.com/contact') || content.includes('7435808031')) {
      // Use regex to strip the contact lines
      content = content.replace(/<p class="wp-block-paragraph"><strong><a href="https:\/\/dholerahub\.com\/contact\/".+?<\/a><\/strong><\/p>/g, '');
      content = content.replace(/<p class="wp-block-paragraph"><strong>a href="https:\/\/dholerahub\.com\/contact\/".+?<\/a><\/strong><\/p>/g, '');
      content = content.replace(/<p class="wp-block-paragraph"><strong>.+?7435808031.+?<\/strong><\/p>/g, '');
      content = content.replace(/<p class="wp-block-paragraph"><strong>Contact us today.+?<\/p>/g, '');
      content = content.replace(/<p class="wp-block-paragraph"><strong>(?:Y|📞|🌐).+?<\/strong><\/p>/g, '');
      
      const newContactBlock = `
<div class="mt-8 rounded-2xl bg-slate-50 dark:bg-slate-800 p-8 text-center border border-slate-100 dark:border-slate-700 shadow-sm">
  <h4 class="wp-block-heading text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-4">Want to learn more about Dholera?</h4>
  <p class="text-slate-600 dark:text-slate-300 mb-6">Contact us today to discover verified land opportunities and get expert guidance on investing in Dholera SIR.</p>
  <a href="/contact" class="inline-flex items-center justify-center rounded-full bg-[#FF7A00] px-8 py-3 text-sm font-black uppercase tracking-widest text-white transition-transform hover:scale-105 shadow-lg shadow-orange-600/10">Contact Us Now</a>
</div>`;
      
      if (!content.includes('href="/contact"')) {
        content = content + newContactBlock;
      }
      modified = true;
    }
    
    if (modified) {
      update.content = content;
      await update.save();
      count++;
      console.log(`Updated post: ${update.title}`);
    }
  }
  
  console.log(`Successfully replaced contact links in ${count} posts.`);
  process.exit(0);
}

run().catch(console.error);
