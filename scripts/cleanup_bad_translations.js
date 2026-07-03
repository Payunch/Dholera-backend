const { Update } = require('../models');

async function clean() {
  console.log('Cleaning up broken translations (English text saved as Hindi/Gujarati)...');
  const deletedHi = await Update.destroy({ where: { lang: 'hi' } });
  const deletedGu = await Update.destroy({ where: { lang: 'gu' } });
  console.log(`Deleted ${deletedHi} broken Hindi posts.`);
  console.log(`Deleted ${deletedGu} broken Gujarati posts.`);
}

clean().catch(console.error);
