const sqlite3 = require('sqlite3').verbose();
const https = require('https');

const db = new sqlite3.Database('backups/database-backup-2026-07-02T18-30-00-546Z.sqlite');

function sendRecoveryRequest(id, content, lang) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ id, content, lang });
    
    const options = {
      hostname: 'api.dholeraplatform.com',
      port: 443,
      path: '/api/updates/recover-post',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };
    
    const req = https.request(options, (res) => {
      let resData = '';
      res.on('data', (c) => resData += c);
      res.on('end', () => resolve(resData));
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

db.all('SELECT id, content, lang FROM Updates', async (err, rows) => {
  if (err) throw err;
  
  let recoveredCount = 0;
  
  for (const row of rows) {
    let content = row.content;
    
    // SAFE REGEX REMOVAL
    content = content.replace(/<div class="mt-8 rounded-2xl bg-slate-50[^]*?Contact Us Now<\/a>[\s\S]*?<\/div>/g, '');
    content = content.replace(/<div class="mt-8 rounded-2xl bg-slate-50[^]*?<\/div>/g, '');
    
    content = content.replace(/<p[^>]*>.*?(?:7435808031|dholerahub\.com|Contact us today|Call\/WhatsApp).*?<\/p>/gi, '');
    content = content.replace(/<p[^>]*>[^<]*?(?:7435808031|dholerahub\.com|Contact us today|Call\/WhatsApp)[^<]*?<\/p>/gi, '');
    
    const newContactBlock = `\n<p class="wp-block-paragraph">📞 Call/WhatsApp: <a href="https://wa.me/917435808031" target="_blank" rel="noopener noreferrer"><strong>+91 7435808031</strong></a></p>\n<p class="wp-block-paragraph">🌐 Website: <a href="https://dholeraplatform.com/contact"><strong>https://dholeraplatform.com/contact</strong></a></p>\n<p class="wp-block-paragraph">Contact us today to discuss your requirements and discover the best land investment opportunities in Dholera SIR.</p>`;
    
    if (!content.includes('href="https://dholeraplatform.com/contact"')) {
      content = content + newContactBlock;
    }
    
    try {
      await sendRecoveryRequest(row.id, content, row.lang || 'en');
      console.log(`Recovered POST ${row.id}`);
      recoveredCount++;
    } catch (err) {
      console.error(`Failed to recover POST ${row.id}:`, err.message);
    }
  }
  
  console.log(`Finished recovering ${recoveredCount} posts!`);
});
