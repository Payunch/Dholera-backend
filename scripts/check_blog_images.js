const { Update } = require('../models');

async function main() {
  const posts = await Update.findAll({ order: [['id', 'ASC']] });
  console.log(`Total blogs in database: ${posts.length}`);

  let missingImageCount = 0;
  let brokenUploadCount = 0;
  let fallbackFromContentCount = 0;

  for (const p of posts) {
    const hasImageUrl = !!p.imageUrl;
    const isUploadPath = p.imageUrl && p.imageUrl.startsWith('/uploads/');
    const contentImgMatch = p.content ? p.content.match(/<img[^>]+src=["']([^"']+)["']/i) : null;
    const firstContentImg = contentImgMatch ? contentImgMatch[1] : null;

    if (!hasImageUrl || isUploadPath) {
      console.log(`ID ${p.id} (${p.title.slice(0, 30)}):`);
      console.log(`  imageUrl: ${p.imageUrl}`);
      console.log(`  firstContentImg: ${firstContentImg}`);
      missingImageCount++;
      if (isUploadPath) brokenUploadCount++;
      if (firstContentImg) fallbackFromContentCount++;
    }
  }

  console.log(`\nSummary:`);
  console.log(`Posts with missing or broken imageUrl: ${missingImageCount}`);
  console.log(`Posts using broken /uploads/ paths: ${brokenUploadCount}`);
  console.log(`Posts where image can be extracted from content: ${fallbackFromContentCount}`);
}

main().catch(console.error);
