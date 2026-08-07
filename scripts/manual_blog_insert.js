require('dotenv').config({ path: '../.env' });
const { Update } = require('../models');
const sequelize = require('../config/database');

async function insertBlog() {
  try {
    await sequelize.authenticate();
    
    const blogData = {
      title: "Dholera Smart City Is India's First Greenfield Industrial Smart City - Latest Updates",
      content: `<p>According to a recent report by <a href="https://news.google.com/rss/articles/CBMirgFBVV95cUxQRmxCZ1ZZZ1JvaTV0Q04wb0R4SnhHaDJSRVUtRUtkTW9MTjBsVEwtX2ZjbENrWVVucU9JUTJJR2UwS21MTHBmeWJGc05IbnVOUkUxSXBQaEFjQWRHVUM5cFJHOXh6cDZMVml0MHo2NUtTU3BKU1VSWVR1TTNVbjZhc3NoLXA3ZUc1ai1KcFc1V2ZONGpuY3lVVDRvZmdCakZrT1hiQjFVZWYxelNHZHc?oc=5" target="_blank">CMO Gujarat</a>, Dholera Smart City is rapidly advancing as India's First Greenfield Industrial Smart City.</p>
<h2>Why Dholera?</h2>
<p>Dholera Special Investment Region (SIR) is a major project under the DMIC (Delhi Mumbai Industrial Corridor), expected to be a global manufacturing hub with world-class infrastructure.</p>
<h2>Investment Opportunities</h2>
<p>With massive government backing, the area is projected to attract significant investments in sectors like defence, aviation, electronics, and heavy engineering.</p>
<br/>
<i>Disclaimer: Real estate investments are subject to market risks. Please do your own research before investing.</i>
<div style="background: #eef2f7; padding: 20px; margin-top: 30px; border-radius: 5px; text-align: center;">
  <h3>Ready to Explore Dholera Smart City?</h3>
  <p><a href="https://dholeraplatform.com/contact" style="font-weight: bold; font-size: 1.2em; color: #0056b3; text-decoration: none;">📞 Call Now: 7435808031<br>🌐 https://dholerahub.com</a></p>
</div>`,
      category: "News",
      published: true,
      imageUrl: null, // Will use default if none
      imagePosition: 'top',
      publishedAt: new Date(),
      lang: 'en',
      author: 'Auto-Blogger AI',
      tags: 'Dholera, Greenfield, Smart City, Investment, Gujarat',
      seoTitle: "Dholera Smart City Is India's First Greenfield Industrial Smart City",
      seoDescription: "Learn why Dholera Smart City is rapidly advancing as India's First Greenfield Industrial Smart City and what it means for investors.",
      seoKeywords: "Dholera, Smart City, Greenfield Industrial City, Investment, Gujarat"
    };

    const newUpdate = await Update.create(blogData);
    console.log(`Successfully created manual blog post with ID: ${newUpdate.id}`);
  } catch (error) {
    console.error('Error inserting blog:', error);
  } finally {
    process.exit(0);
  }
}

insertBlog();
