require('dotenv').config();
const { Update } = require('./models');

async function main() {
  const post = await Update.findByPk(49);
  if (!post) {
    console.error('Post ID 49 not found!');
    process.exit(1);
  }

  const imageUrl = 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1791432012/dholera/images/08-10_etgcfo.jpg';
  const imageAltText = 'Smart investors and engineers reviewing land development plans in Dholera emerging real estate market';
  const imageTitle = 'Emerging Real Estate Markets - Dholera Smart City Investment';

  await post.update({
    imageUrl,
    imageAltText,
    imageTitle,
    imagePosition: 'top'
  });

  console.log(`✓ Successfully updated Post ID 49:`);
  console.log(`  Title: ${post.title}`);
  console.log(`  ImageUrl: ${post.imageUrl}`);
  console.log(`  ImageAlt: ${post.imageAltText}`);
  console.log(`  Published: ${post.published}, Approved: ${post.isApproved}`);
  process.exit(0);
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
