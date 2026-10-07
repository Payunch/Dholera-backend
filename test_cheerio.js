const cheerio = require('cheerio');
const translate = require('translate-google');

async function test() {
  const html = '<div class="wp-block-image"><p>Welcome to Dholera!</p><a href="/link">Click here</a></div>';
  const $ = cheerio.load(html, null, false);
  const textNodes = [];

  function traverse(node) {
    if (node.type === 'text') {
      const text = node.data.trim();
      if (text) {
        textNodes.push(node);
      }
    } else if (node.type === 'tag') {
      if (node.name !== 'script' && node.name !== 'style') {
        node.children.forEach(traverse);
      }
    }
  }

  $('body').contents().forEach(traverse);
  
  const strings = textNodes.map(n => n.data.trim());
  console.log('To translate:', strings);
  
  try {
    const translated = await translate(strings, { to: 'hi' });
    console.log('Translated:', translated);
    
    for (let i = 0; i < textNodes.length; i++) {
      textNodes[i].data = textNodes[i].data.replace(strings[i], translated[i]);
    }
    console.log('Final HTML:', $.html());
  } catch (err) {
    console.error(err);
  }
}
test();
