const { Update } = require('./models');

const contactSnippet = `
<p class="wp-block-paragraph"></p>

<p class="wp-block-paragraph">📞 Call/WhatsApp: <a href="https://wa.me/917435808031" target="_blank" rel="noopener noreferrer"><strong>+91 7435808031</strong></a></p>
<p class="wp-block-paragraph">🌐 Website: <a href="https://dholeraplatform.com/contact"><strong>https://dholeraplatform.com/contact</strong></a></p>
<p class="wp-block-paragraph">Contact us today to discuss your requirements and discover the best land investment opportunities in Dholera SIR.</p>`;

async function fixContactBlock() {
  try {
    const posts = await Update.findAll();
    let updatedCount = 0;
    
    for (const post of posts) {
      let content = post.content;
      
      // We want to ensure the exact contactSnippet is perfectly at the end.
      // First, let's remove any line that contains the phone number, website url, or the contact pitch
      // This will wipe out all previous imperfect variations and our previous insertion
      
      let modified = false;
      
      // Regex to remove paragraphs containing specific contact details
      const phoneRegex = /<p[^>]*>.*?(\+91\s*7435808031|📞|Call\/WhatsApp:).*?<\/p>/gi;
      const webRegex = /<p[^>]*>.*?(🌐|Website:|dholeraplatform\.com\/contact).*?<\/p>/gi;
      const pitchRegex = /<p[^>]*>.*?Contact us today to discuss your requirements.*?<\/p>/gi;
      
      // Also remove empty wp-block-paragraph that we might have added right before the block
      const emptyPRegex = /<p class="wp-block-paragraph"><\/p>/gi;

      const origLength = content.length;
      content = content.replace(phoneRegex, '');
      content = content.replace(webRegex, '');
      content = content.replace(pitchRegex, '');
      content = content.replace(emptyPRegex, '');
      content = content.trim();

      // Now we append the PERFECT snippet at the very end
      content = content + "\n" + contactSnippet;
      
      if (post.content !== content) {
        post.content = content;
        await post.save();
        updatedCount++;
      }
    }
    
    console.log(`Successfully normalized contact blocks on ${updatedCount} posts.`);
    process.exit(0);
  } catch(e) {
    console.error("Error fixing DB:", e);
    process.exit(1);
  }
}

fixContactBlock();
