const Parser = require('rss-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Update } = require('../models');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

const parser = new Parser();
// Quality-first editorial pipeline. These defaults retain the original
// three-source review and AI image-fit selection.
const AUTO_BLOG_MODEL = process.env.GEMINI_TEXT_MODEL || 'gemini-3.5-flash';
const AUTO_BLOG_MAX_CANDIDATES = Math.max(1, Math.min(Number(process.env.AUTO_BLOG_MAX_CANDIDATES) || 3, 3));
const AUTO_BLOG_USE_VISION_SELECTION = process.env.AUTO_BLOG_USE_VISION_SELECTION !== 'false';

// Configure the Gemini Client
const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

/**
 * Validates a news snippet against Google Ads policy and verifies it.
 */
async function verifyNewsWithGemini(title, content) {
  const prompt = `
You are a strict compliance and verification officer for a real estate portal about "Dholera Smart City".
Review the following news article title and content.
1. Authenticity: Does this sound like a real news event about Dholera, Gujarat, India? (Ignore it if it sounds like obvious spam or unrelated).
2. Google Ads Policy: Does this content violate Google Ads policies? (e.g., hate speech, dangerous content, sensitive events like tragedies, adult content).
3. Relevance: Is this relevant to investors or people interested in Dholera?

News Title: ${title}
News Content: ${content}

Respond with exactly one word and no punctuation: YES if all three checks pass; otherwise NO.
`;

  try {
    const model = ai.getGenerativeModel({ model: AUTO_BLOG_MODEL });
    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: { maxOutputTokens: 32 }
    });
    
    const answer = response.response.text().trim().toUpperCase();
    return {
      verified: answer === 'YES',
      reason: answer === 'YES' ? 'Passed automated relevance and policy check.' : 'Rejected by automated relevance or policy check.'
    };
  } catch (error) {
    console.error('[AutoBlog] Error verifying news:', error);
    return { verified: false, reason: 'Error communicating with Gemini API' };
  }
}

/**
 * Generates an SEO optimized blog post based on the news snippet and editorial guidelines.
 */
async function generateBlogPost(title, content, sourceUrl) {
  const currentDateStr = new Date().toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const prompt = `
You are an expert SEO content writer and real estate blogger for "Dholera Smart City".
Today's Date: ${currentDateStr}
Write a comprehensive, engaging, and highly SEO-optimized blog post based on the following news.
Target Audience: Real estate investors, businesses, and people looking to buy land in Dholera SIR.

Requirements for Editorial Quality:
- **News Sourcing:** You MUST attribute the source of the news within the first paragraph (e.g., "According to a recent report by [Source Name]..."). Link to the source if applicable.
- **Objective Tone:** AVOID over-promotional and absolute claims like 'guaranteed' or 'goldmine'. Use softer, compliant language such as 'expected to', 'projected', 'may contribute to', and 'potential'.
- **Context Details:** Ensure key facts like location, current date (${currentDateStr}), and specific project names from the news are accurately included.
- **Risk Disclaimer:** Include a standard, brief risk disclaimer at the very end of the post (e.g., "Disclaimer: Real estate investments are subject to market risks...").

Requirements for WordPress SEO Ranking:
- **Length:** Write a comprehensive post between 800 and 1,200 words.
- **Table of Contents:** Include a dynamic Table of Contents at the top using a <ul> list with anchor links (e.g., <a href="#section1">) to the corresponding H2 tags which must have matching id attributes (e.g., <h2 id="section1">).
- **Introduction:** State the core answer/summary within the first 100 words, including the primary keyword.
- **Structure:** Break text into 200-300 word sections. Use proper HTML tags (<h2>, <h3>, <p>, <ul>, <li>). 
- **Internal/External Links:** Include at least 2 relevant external links to authoritative sources (using <a href="...">) and 3 placeholders for internal links (e.g., <a href="/blog/dholera-investment-guide">our guide</a>).
- **CTA:** Include a strong, professional Call to Action at the end, along with contact details placeholder (e.g., Contact us at +91-XXXXXXXXXX).

Also provide SEO Metadata: tags (comma separated), seoTitle (max 60 chars), seoDescription (max 160 chars), and seoKeywords (comma separated).

News Title: ${title}
News Source URL: ${sourceUrl || 'Unknown'}
News Content: ${content}

Respond strictly in JSON format without markdown wrapping, like this:
{
  "title": "SEO Optimized Blog Title",
  "content": "The full HTML content of the blog post...",
  "category": "News",
  "tags": "tag1, tag2, tag3",
  "seoTitle": "...",
  "seoDescription": "...",
  "seoKeywords": "..."
}
`;

  try {
    const model = ai.getGenerativeModel({ model: AUTO_BLOG_MODEL });
    const response = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        maxOutputTokens: 6000,
        responseMimeType: 'application/json'
      }
    });
    
    let text = response.response.text();
    if (text.startsWith('```json')) text = text.replace(/```json\n/, '').replace(/\n```$/, '');

    const result = JSON.parse(text);
    return result;
  } catch (error) {
    console.error('[AutoBlog] Error generating blog post:', error);
    return null;
  }
}

/**
 * Final local safety gate for generated copy. This catches high-risk claims
 * before a draft reaches the admin panel, without adding another paid API call.
 * It is a safeguard, not a guarantee of Google Ads approval.
 */
function hasUnsafeAdvertisingClaims(content) {
  const prohibitedClaims = [
    /\bguaranteed\s+(?:return|profit|income|approval|investment)/i,
    /\b(?:100|one hundred)\s*%\s*(?:guaranteed|return|profit)/i,
    /\brisk[-\s]?free\b/i,
    /\bassured\s+(?:return|profit|income)/i,
    /\bget\s+rich\s+quick/i,
    /\bdouble\s+your\s+money\b/i,
    /\bno\s+risk\b/i
  ];

  return prohibitedClaims.some(pattern => pattern.test(content || ''));
}

/**
 * Analyzes local unused images with Gemini and chooses the best one for the blog.
 */
async function generateImageForBlog(blogTitle) {
  try {
    const assetsDir = path.join(__dirname, '..', 'assets', 'blog_images');
    if (!fs.existsSync(assetsDir)) return null;

    // 1. Get all available images
    const allImages = fs.readdirSync(assetsDir).filter(f => f.endsWith('.jpg'));
    if (allImages.length === 0) return null;

    // 2. Get already used images from DB
    const updates = await Update.findAll({ attributes: ['imageUrl'] });
    const usedImages = updates
      .map(u => u.imageUrl)
      .filter(url => url)
      .map(url => path.basename(url)); // gets '1.1.jpg' from '/uploads/images/1.1.jpg'

    // 3. Find unused images
    let unusedImages = allImages.filter(img => !usedImages.includes(img));
    if (unusedImages.length === 0) {
      console.log('[AutoBlog] All images have been used! Reusing an old image as fallback.');
      unusedImages = allImages; // fallback to all if none left
    }

    // 4. Pick up to 4 random unused images to analyze
    const shuffled = unusedImages.sort(() => 0.5 - Math.random());
    const candidates = shuffled.slice(0, Math.min(4, unusedImages.length));

    let chosenImage = candidates[0]; // default to first

    // Image inputs are expensive. Use the local first-match unless this is
    // explicitly enabled in the environment.
    if (AUTO_BLOG_USE_VISION_SELECTION && candidates.length > 1) {
      // 5. Ask Gemini to analyze and pick the best one
      const promptParts = [
        { text: `You are an expert real estate editor. Which of the following images is the absolute best fit for a blog post titled: "${blogTitle}"? Respond STRICTLY with ONLY the exact filename of the best image. Do not explain.` }
      ];

      for (const filename of candidates) {
        const filePath = path.join(assetsDir, filename);
        const fileData = fs.readFileSync(filePath).toString("base64");
        
        promptParts.push({ text: `\nCandidate Filename: ${filename}` });
        promptParts.push({
          inlineData: {
            data: fileData,
            mimeType: "image/jpeg"
          }
        });
      }

      try {
        const imageModel = ai.getGenerativeModel({ model: AUTO_BLOG_MODEL });
        const response = await imageModel.generateContent(promptParts);
        const answer = response.response.text().trim();
        
        // Clean the answer just in case Gemini added quotes or markdown
        const cleanedAnswer = answer.replace(/["']/g, '').replace(/`/g, '').trim();
        
        if (candidates.includes(cleanedAnswer)) {
          chosenImage = cleanedAnswer;
          console.log(`[AutoBlog] Gemini analyzed images and chose: ${chosenImage}`);
        } else {
          console.log(`[AutoBlog] Gemini returned invalid filename: ${answer}. Using default.`);
        }
      } catch (geminiError) {
        console.error('[AutoBlog] Gemini image analysis failed, falling back to random choice.', geminiError.message);
      }
    }

    // 6. Copy chosen image to uploads
    const chosenSrcPath = path.join(assetsDir, chosenImage);
    const uploadsDir = path.join(__dirname, '..', 'uploads', 'images');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Create a new filename to avoid path caching issues on the frontend, or just use the original
    // Using original name is fine and helps us track duplicates.
    const chosenDestPath = path.join(uploadsDir, chosenImage);
    fs.copyFileSync(chosenSrcPath, chosenDestPath);

    return `/uploads/images/${chosenImage}`;
  } catch (error) {
    console.error('[AutoBlog] Error in image analysis workflow:', error);
    return null;
  }
}

async function runDaily(options = {}) {
  const { ignoreGap = false } = options;
  console.log('[AutoBlog] Starting Dholera news auto-blog pipeline...');
  
  if (!process.env.GEMINI_API_KEY) {
    console.error('[AutoBlog] Aborted. GEMINI_API_KEY is missing from environment variables.');
    return;
  }

  // Enforce 1-day gap rule (at least 36 hours since last auto-blog post)
  if (!ignoreGap) {
    try {
      const lastAutoBlog = await Update.findOne({
        where: { author: 'Auto-Blogger AI' },
        order: [['createdAt', 'DESC']]
      });
      if (lastAutoBlog && lastAutoBlog.createdAt) {
        const hoursSinceLast = (new Date() - new Date(lastAutoBlog.createdAt)) / (1000 * 60 * 60);
        if (hoursSinceLast < 36) {
          console.log(`[AutoBlog] Skipping run. Last auto-blog post was created ${hoursSinceLast.toFixed(1)} hours ago (enforcing 1-day gap).`);
          return null;
        }
      }
    } catch (err) {
      console.warn('[AutoBlog] Could not check last auto-blog date, proceeding:', err.message);
    }
  }

  try {
    // 1. Fetch News
    const feedUrl = 'https://news.google.com/rss/search?q=Dholera&hl=en-IN&gl=IN&ceid=IN:en';
    const feed = await parser.parseURL(feedUrl);
    
    if (!feed.items || feed.items.length === 0) {
      console.log('[AutoBlog] No news found for Dholera today.');
      return;
    }

    // Review up to three news sources so a rejected or irrelevant first item
    // does not prevent a quality blog from being produced.
    for (let i = 0; i < Math.min(AUTO_BLOG_MAX_CANDIDATES, feed.items.length); i++) {
      const item = feed.items[i];
      console.log(`[AutoBlog] Evaluating News: ${item.title}`);

      // Check if we already processed a very similar title recently
      const existing = await Update.findOne({
        where: { title: item.title }
      });
      if (existing) {
         console.log(`[AutoBlog] Skipping, article already seems to exist.`);
         continue;
      }

      // 2. Verify News
      const verification = await verifyNewsWithGemini(item.title, item.contentSnippet || item.content);
      
      if (verification.verified) {
        console.log(`[AutoBlog] News Verified! Reason: ${verification.reason}`);
        
        // 3. Generate Blog Post
        const blogData = await generateBlogPost(item.title, item.contentSnippet || item.content, item.link);
        
        if (blogData) {
          console.log(`[AutoBlog] Blog post generated. Title: ${blogData.title}`);

          if (hasUnsafeAdvertisingClaims(blogData.content)) {
            console.warn('[AutoBlog] Generated copy failed the advertising-claims safety gate. Draft not saved.');
            continue;
          }
          
          // Inject the requested Contact CTA at the very end
          const ctaHtml = `\n\n<div style="background: #eef2f7; padding: 20px; margin-top: 30px; border-radius: 5px; text-align: center;">
  <h3>Ready to Explore Dholera Smart City?</h3>
  <p><a href="https://dholeraplatform.com/contact" style="font-weight: bold; font-size: 1.2em; color: #0056b3; text-decoration: none;">📞 Call Now: 7435808031<br>🌐 https://dholerahub.com</a></p>
</div>`;
          blogData.content += ctaHtml;
          
          // 4. Generate Image
          let imageUrl = null;
          try {
             imageUrl = await generateImageForBlog(blogData.title);
             console.log(`[AutoBlog] Image generated: ${imageUrl}`);
          } catch(e) {
             console.log(`[AutoBlog] Failed to generate image, continuing without it.`, e.message);
          }
          
          // 5. Save to Database as Draft (Pending Approval)
          const newUpdate = await Update.create({
            title: blogData.title,
            content: blogData.content,
            category: blogData.category || 'News',
            published: false, // Save as unpublished so Admin must approve it
            isApproved: false, // Explicitly mark as pending approval
            imageUrl: imageUrl,
            imagePosition: 'top',
            publishedAt: new Date(),
            lang: 'en',
            author: 'Auto-Blogger AI',
            tags: blogData.tags,
            seoTitle: blogData.seoTitle,
            seoDescription: blogData.seoDescription,
            seoKeywords: blogData.seoKeywords
          });

          console.log(`[AutoBlog] Successfully created draft blog post with ID: ${newUpdate.id}`);
          
          // Only create one blog post per day
          return newUpdate;
        }
      } else {
        console.log(`[AutoBlog] News Rejected. Reason: ${verification.reason}`);
      }
    }
    
    console.log('[AutoBlog] Daily run complete.');
    return null;
  } catch (error) {
    console.error('[AutoBlog] Critical error during daily run:', error);
    return null;
  }
}

module.exports = {
  runDaily,
  verifyNewsWithGemini,
  generateBlogPost,
  generateImageForBlog,
  hasUnsafeAdvertisingClaims
};
