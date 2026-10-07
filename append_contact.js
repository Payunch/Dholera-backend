const { Update } = require('./models');

const contactSnippet = `
<p class="wp-block-paragraph"></p>

<p class="wp-block-paragraph">📞 Call/WhatsApp: <a href="https://wa.me/917435808031" target="_blank" rel="noopener noreferrer"><strong>+91 7435808031</strong></a></p>
<p class="wp-block-paragraph">🌐 Website: <a href="https://dholeraplatform.com/contact"><strong>https://dholeraplatform.com/contact</strong></a></p>
<p class="wp-block-paragraph">Contact us today to discuss your requirements and discover the best land investment opportunities in Dholera SIR.</p>`;

async function updateDb() {
  try {
    const posts = await Update.findAll();
    let updatedCount = 0;
    
    for (const post of posts) {
      let changed = false;
      
      // Update Author
      if (post.author !== 'Naresh Gohel') {
        post.author = 'Naresh Gohel';
        changed = true;
      }
      
      // Append Contact Snippet if it doesn't exist
      if (!post.content.includes('+91 7435808031')) {
        post.content = post.content + "\n" + contactSnippet;
        changed = true;
      }
      
      if (changed) {
        await post.save();
        updatedCount++;
      }
    }
    
    console.log(`Successfully updated ${updatedCount} posts in the database.`);
    process.exit(0);
  } catch(e) {
    console.error("Error updating DB:", e);
    process.exit(1);
  }
}

updateDb();
