const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

const dbPaths = ['/data/database.sqlite', path.join(__dirname, '../data/database.sqlite')].filter(fs.existsSync);

async function run() {
  for (const dbPath of dbPaths) {
    const sequelize = new Sequelize({ dialect: 'sqlite', storage: dbPath, logging: false });
    const [rows] = await sequelize.query('SELECT id, content FROM Updates WHERE id = 27').catch(() => [[]]);
    if (!rows.length) continue;

    let content = rows[0].content;

    const startMarker = '<!-- Contextual Mid-Article CTA: TP1 vs TP2 Plot Rates -->';
    const endMarker = 'WhatsApp Instant\n    </a>\n  </div>\n</div>';

    const startIdx = content.indexOf(startMarker);
    if (startIdx !== -1) {
      const endIdx = content.indexOf(endMarker, startIdx);
      if (endIdx !== -1) {
        content = content.slice(0, startIdx) + '{{cta_rate_sheet}}\n' + content.slice(endIdx + endMarker.length);
      }
    }

    await sequelize.query(
      'UPDATE Updates SET category = :category, seoKeywords = :seoKeywords, content = :content WHERE id = 27',
      {
        replacements: {
          category: 'Investment',
          seoKeywords: 'Dholera Smart Utility Ducts',
          content: content
        }
      }
    );
    console.log('Successfully updated Blog 27 in', dbPath);
  }
}

run().catch(console.error);
