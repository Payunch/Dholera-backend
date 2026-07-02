const fs = require('fs');

async function cleanupAndReimport() {
  const loginRes = await fetch('https://api.dholeraplatform.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'change-me' })
  });
  const loginData = await loginRes.json();
  
  if (!loginData.token) {
    console.error('Failed to login:', loginData);
    process.exit(1);
  }
  
  const token = loginData.token;
  console.log('Logged in successfully!');

  // Fetch all posts from live API
  const res = await fetch('https://api.dholeraplatform.com/api/content/updates?lang=en&all=true');
  const livePosts = await res.json();
  
  console.log(`Found ${livePosts.length} posts on live API.`);
  
  // We want to delete ALL posts that came from WordPress (we'll keep the 6 premium seeded ones if they weren't duplicated, 
  // but wait, the WP posts have titles. Let's just delete ALL posts so we have a clean slate, then re-seed the 6 premium, then WP?
  // No, let's only delete the WordPress ones by checking against WP titles.
  const wpRes = await fetch('https://dholerahub.com/wp-json/wp/v2/posts?per_page=100&_embed=1');
  const wpPosts = await wpRes.json();
  
  const wpTitles = new Set(wpPosts.map(p => {
    let t = p.title && p.title.rendered ? p.title.rendered : 'Untitled';
    return t.replace(/&#8211;/g, '-').replace(/&#8217;/g, "'").replace(/&amp;/g, '&');
  }));
  
  console.log(`Deleting ${livePosts.length} posts...`);
  let deleteCount = 0;
  for (const post of livePosts) {
    if (wpTitles.has(post.title)) {
      // It's a wordpress post, delete it
      await fetch(`https://api.dholeraplatform.com/api/updates/${post.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      deleteCount++;
    }
  }
  
  console.log(`Deleted ${deleteCount} old WordPress posts.`);
  
  console.log(`Uploading ${wpPosts.length} posts with rich metadata to live API...`);
  
  let successCount = 0;
  for (const post of wpPosts) {
    const title = post.title && post.title.rendered ? post.title.rendered : 'Untitled';
    const content = post.content && post.content.rendered ? post.content.rendered : '';
    const publishedAt = post.date ? new Date(post.date) : new Date();
    
    // Extract Author
    let authorName = 'Admin';
    if (post._embedded && post._embedded.author && post._embedded.author.length > 0) {
      authorName = post._embedded.author[0].name;
    }
    
    // Extract Categories & Tags
    let categoryName = 'Blog';
    let tagNames = '';
    if (post._embedded && post._embedded['wp:term']) {
      const cats = post._embedded['wp:term'][0] || [];
      if (cats.length > 0) {
        categoryName = cats.map(c => c.name).join(', ');
      }
      const tags = post._embedded['wp:term'][1] || [];
      if (tags.length > 0) {
        tagNames = tags.map(t => t.name).join(', ');
      }
    }
    
    // Extract Image URL
    let imageUrl = null;
    if (post._embedded && post._embedded['wp:featuredmedia'] && post._embedded['wp:featuredmedia'].length > 0) {
      imageUrl = post._embedded['wp:featuredmedia'][0].source_url;
    } else {
      // Fallback: extract first image from content
      const match = content.match(/<img[^>]+src="([^">]+)"/);
      if (match && match[1]) {
        imageUrl = match[1];
      }
    }
    
    // Fallback SEO Description to Excerpt
    let seoDesc = '';
    if (post.excerpt && post.excerpt.rendered) {
      seoDesc = post.excerpt.rendered.replace(/<[^>]*>?/gm, '').trim();
    }
    
    const payload = {
      title: title.replace(/&#8211;/g, '-').replace(/&#8217;/g, "'").replace(/&amp;/g, '&'),
      content: content,
      category: categoryName,
      published: true,
      publishedAt: publishedAt.toISOString(),
      lang: 'en',
      author: authorName,
      tags: tagNames,
      seoTitle: title.replace(/&#8211;/g, '-').replace(/&#8217;/g, "'").replace(/&amp;/g, '&'),
      seoDescription: seoDesc,
      seoKeywords: tagNames,
      imageUrl: imageUrl
    };
    
    try {
      const res = await fetch('https://api.dholeraplatform.com/api/updates', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      if (res.ok) {
        console.log(`Uploaded: ${payload.title}`);
        successCount++;
      } else {
        console.error(`Failed to upload ${payload.title}:`, data);
      }
    } catch (err) {
      console.error(`Error uploading ${payload.title}:`, err.message);
    }
  }
  
  console.log(`Finished! Successfully uploaded ${successCount} blogs to live API!`);
}

cleanupAndReimport().catch(console.error);
