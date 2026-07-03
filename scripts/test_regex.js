const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('backups/database-backup-2026-07-02T18-30-00-546Z.sqlite');

db.all('SELECT id, content FROM Updates', (err, rows) => {
  if (err) throw err;
  
  let destroyedCount = 0;
  
  for (const row of rows) {
    let content = row.content;
    
    // SAFE REGEX REMOVAL
    content = content.replace(/<div class="mt-8 rounded-2xl bg-slate-50[^]*?Contact Us Now<\/a>[\s\S]*?<\/div>/g, '');
    content = content.replace(/<div class="mt-8 rounded-2xl bg-slate-50[^]*?<\/div>/g, '');
    
    // Safer regex for P tags without 's' flag so it doesn't cross newlines
    content = content.replace(/<p[^>]*>.*?(?:7435808031|dholerahub\.com|Contact us today|Call\/WhatsApp).*?<\/p>/gi, '');
    content = content.replace(/<p[^>]*>[^<]*?(?:7435808031|dholerahub\.com|Contact us today|Call\/WhatsApp)[^<]*?<\/p>/gi, '');
    
    // Ensure we didn't destroy it
    if (content.length < 500 && row.content.length > 1000) {
      console.log(`DESTROYED ID ${row.id}! Original: ${row.content.length}, New: ${content.length}`);
      destroyedCount++;
    }
  }
  
  console.log(`Test finished. Destroyed: ${destroyedCount}`);
});
