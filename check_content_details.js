require('dotenv').config();
const { Update } = require('./models');

async function main() {
  const p68 = await Update.findByPk(68);
  console.log('ID 68 Title:', p68.title);
  console.log('ID 68 Content Snippet:', p68.content.substring(0, 300));
  
  const p58 = await Update.findByPk(58);
  console.log('\nID 58 Title:', p58.title);
  console.log('ID 58 Content Snippet:', p58.content.substring(0, 300));
  console.log('ID 58 Slug:', p58.slug);

  const p64 = await Update.findByPk(64);
  console.log('\nID 64 Slug:', p64.slug);

  process.exit();
}

main().catch(err => { console.error(err); process.exit(1); });
