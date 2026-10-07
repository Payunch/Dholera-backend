const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./data/database.sqlite');

const contactFooter = `

<p class="wp-block-paragraph"></p>

<p class="wp-block-paragraph">📞 Call/WhatsApp: <a href="https://wa.me/917435808031" target="_blank" rel="noopener noreferrer"><strong>+91 7435808031</strong></a></p>
<p class="wp-block-paragraph">🌐 Website: <a href="https://dholeraplatform.com/contact"><strong>https://dholeraplatform.com/contact</strong></a></p>
<p class="wp-block-paragraph">Contact us today to discuss your requirements and discover the best land investment opportunities in Dholera SIR.</p>`;

db.all("SELECT id, content FROM Updates WHERE lang = 'en'", [], (err, rows) => {
  if (err) throw err;

  let updateCount = 0;

  db.serialize(() => {
    db.run("BEGIN TRANSACTION");
    const stmt = db.prepare("UPDATE Updates SET content = ? WHERE id = ?");

    for (const row of rows) {
      let content = row.content;

      // Clean up previous attempts/variations of the footer
      // 1. Remove exact matches of the previous contact strings
      content = content.replace(/<p class="wp-block-paragraph"><\/p>\s*<p class="wp-block-paragraph">📞 Call\/WhatsApp:[^<]*<a href="https:\/\/wa\.me\/[0-9]+"[^>]*><strong>\+[0-9\s]+<\/strong><\/a><\/p>\s*<p class="wp-block-paragraph">🌐 Website:[^<]*<a href="[^"]+"[^>]*><strong>[^<]+<\/strong><\/a><\/p>\s*<p class="wp-block-paragraph">Contact us today[^<]+<\/p>/gi, '');

      // 2. Remove loose matches of just the Call/WhatsApp line to the end
      // This will catch partial footers
      content = content.replace(/<p class="wp-block-paragraph">\s*📞 Call\/WhatsApp[\s\S]*?(<\/p>\s*){1,5}$/gi, '');

      content = content.trim();

      // Append the standardized footer
      content = content + contactFooter;

      stmt.run(content, row.id);
      updateCount++;
    }

    stmt.finalize();
    db.run("COMMIT", () => {
      console.log(`Successfully updated ${updateCount} English blog posts with the standardized contact footer.`);
      // After updating EN, we should delete all translations so they get regenerated with the new footer!
      db.run("DELETE FROM Updates WHERE original_id IS NOT NULL", (err) => {
          if (err) console.error(err);
          else console.log("Deleted old translations to force regeneration.");
          db.close();
      });
    });
  });
});
