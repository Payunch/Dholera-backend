const axios = require('axios');
const { Update } = require('../models');

async function importWordPressBlogs() {
  const baseUrl = 'https://dholerahub.com';
  let page = 1;
  let totalImported = 0;

  console.log(`Starting the jugaad on ${baseUrl}...`);

  while (true) {
    try {
      const apiUrl = `${baseUrl}/wp-json/wp/v2/posts?per_page=10&page=${page}`;
      console.log(`Fetching page ${page}...`);
      
      const response = await axios.get(apiUrl);
      const posts = response.data;

      if (!posts || posts.length === 0) {
        console.log('No more posts found. Finished!');
        break;
      }

      console.log(`Fetched ${posts.length} posts from page ${page}...`);

      for (const post of posts) {
        // Extract basic data
        const title = post.title && post.title.rendered ? post.title.rendered : 'Untitled';
        const content = post.content && post.content.rendered ? post.content.rendered : '';
        const publishedAt = post.date ? new Date(post.date) : new Date();

        // Check if it already exists to avoid duplicates (using title)
        const existing = await Update.findOne({ where: { title: title.replace(/&#8211;/g, '-').replace(/&#8217;/g, "'").replace(/&amp;/g, '&') } });
        if (existing) {
          console.log(`Post titled "${title}" already exists, skipping...`);
          continue;
        }

        // Insert into database
        await Update.create({
          title: title.replace(/&#8211;/g, '-').replace(/&#8217;/g, "'").replace(/&amp;/g, '&'),
          content: content,
          category: 'Blog', // Defaulting to Blog
          imageUrl: null, // You could fetch the featured media here if needed
          imagePosition: 'top',
          published: true,
          publishedAt: publishedAt,
          lang: 'en',
          original_id: post.id,
          id: 10000 + post.id
        });
        
        totalImported++;
      }

      page++;
      
      // Be gentle to the server
      await new Promise(resolve => setTimeout(resolve, 1000));
      
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('Reached the end of the posts!');
      } else {
        console.error('Error fetching posts:', error.message);
        if (error.errors) {
          console.error(error.errors.map(e => e.message));
        }
      }
      break;
    }
  }

  console.log(`Success! Extracted ${totalImported} blogs into the Dholera database! 🚀`);
  process.exit(0);
}

importWordPressBlogs();
