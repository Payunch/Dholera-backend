const { Update } = require('../models');
const sequelize = require('../config/database');

const blocks = {
  hi: `
<p class="wp-block-paragraph">📞 कॉल/WhatsApp: <a href="https://wa.me/917435808031" target="_blank" rel="noopener noreferrer"><strong>7435808031</strong></a></p>
<p class="wp-block-paragraph">🌐 वेबसाइट: <a href="https://dholeraplatform.com/contact"><strong>https://dholeraplatform.com/contact</strong></a></p>
<p class="wp-block-paragraph">अपनी आवश्यकताओं पर चर्चा करने और धोलेरा SIR में सर्वोत्तम भूमि निवेश के अवसर खोजने के लिए आज ही हमसे संपर्क करें।</p>`,
  gu: `
<p class="wp-block-paragraph">📞 કૉલ/WhatsApp: <a href="https://wa.me/917435808031" target="_blank" rel="noopener noreferrer"><strong>7435808031</strong></a></p>
<p class="wp-block-paragraph">🌐 વેબસાઇટ: <a href="https://dholeraplatform.com/contact"><strong>https://dholeraplatform.com/contact</strong></a></p>
<p class="wp-block-paragraph">તમારી આવશ્યકતાઓની ચર્ચા કરવા અને ધોલેરા SIR માં શ્રેષ્ઠ જમીન રોકાણની તકો શોધવા માટે આજે જ અમારો સંપર્ક કરો.</p>`
};

async function run() {
  await sequelize.authenticate();
  const updates = await Update.findAll();
  
  let count = 0;
  for (const update of updates) {
    if (update.lang === 'hi' || update.lang === 'gu') {
      let content = update.content;
      
      // If it doesn't already have the contact link
      if (!content.includes('dholeraplatform.com/contact')) {
        content = content + blocks[update.lang];
        update.content = content.trim();
        await update.save();
        count++;
        console.log(`Appended block to ${update.lang} post: ${update.title}`);
      }
    }
  }
  
  console.log(`Successfully added contact blocks to ${count} non-English posts.`);
  process.exit(0);
}

run().catch(console.error);
