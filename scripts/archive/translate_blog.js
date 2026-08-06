const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Update, sequelize } = require('./models');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

async function translatePost(post, targetLang) {
  const langName = targetLang === 'hi' ? 'Hindi' : 'Gujarati';
  
  const prompt = `
You are an expert translator specializing in Indian regional languages and real estate content.
Translate the following blog post into ${langName}.

Rules:
- Translate the title AND the full HTML content.
- Keep all HTML tags intact (<h2>, <p>, <a>, <ul>, <li>, etc.).
- Keep href URLs and image paths exactly as they are (do not translate URLs).
- Keep proper nouns like "Dholera", "Tata", "Entegris", "SIR", "Gujarat" in English.
- Translate the SEO metadata (seoTitle, seoDescription, tags) as well.
- Make the translation natural and fluent, not word-by-word.

Original Title: ${post.title}
Original SEO Title: ${post.seoTitle}
Original SEO Description: ${post.seoDescription}
Original Tags: ${post.tags}
Original Content:
${post.content}

Respond strictly in JSON format without markdown wrapping:
{
  "title": "Translated title",
  "content": "Translated full HTML content",
  "seoTitle": "Translated SEO title (max 60 chars)",
  "seoDescription": "Translated SEO description (max 160 chars)",
  "tags": "Translated tags, comma separated"
}
`;

  console.log(`[Translate] Generating ${langName} translation...`);
  const model = ai.getGenerativeModel({ model: "gemini-3.5-flash" });
  const response = await model.generateContent(prompt);
  
  let text = response.response.text();
  // Clean markdown code fences if present
  if (text.startsWith('```json')) text = text.replace(/```json\n?/, '').replace(/\n?```$/, '');
  if (text.startsWith('```')) text = text.replace(/```\n?/, '').replace(/\n?```$/, '');
  
  const result = JSON.parse(text);
  console.log(`[Translate] ${langName} title: ${result.title.substring(0, 60)}...`);
  return result;
}

async function main() {
  await sequelize.sync();
  
  const post = await Update.findByPk(58);
  if (!post) {
    console.error('Post 58 not found!');
    process.exit(1);
  }

  console.log(`Original post: "${post.title}"`);
  console.log('');

  // Generate Hindi translation
  const hiData = await translatePost(post, 'hi');
  const hiPost = await Update.create({
    title: hiData.title,
    content: hiData.content,
    category: post.category,
    imageUrl: post.imageUrl,
    imagePosition: post.imagePosition,
    published: true,
    publishedAt: new Date(),
    lang: 'hi',
    original_id: post.id,
    author: post.author,
    tags: hiData.tags,
    seoTitle: hiData.seoTitle,
    seoDescription: hiData.seoDescription,
    seoKeywords: post.seoKeywords
  });
  console.log(`[OK] Hindi translation saved as ID ${hiPost.id}`);

  // Generate Gujarati translation
  const guData = await translatePost(post, 'gu');
  const guPost = await Update.create({
    title: guData.title,
    content: guData.content,
    category: post.category,
    imageUrl: post.imageUrl,
    imagePosition: post.imagePosition,
    published: true,
    publishedAt: new Date(),
    lang: 'gu',
    original_id: post.id,
    author: post.author,
    tags: guData.tags,
    seoTitle: guData.seoTitle,
    seoDescription: guData.seoDescription,
    seoKeywords: post.seoKeywords
  });
  console.log(`[OK] Gujarati translation saved as ID ${guPost.id}`);

  // Export all 3 posts for production transfer
  const fs = require('fs');
  const allPosts = [post, hiPost, guPost];
  const exportData = allPosts.map(p => ({
    title: p.title,
    content: p.content,
    category: p.category,
    imageUrl: p.imageUrl,
    imagePosition: p.imagePosition,
    published: p.published,
    publishedAt: p.publishedAt,
    lang: p.lang,
    original_id: p.original_id,
    author: p.author,
    tags: p.tags,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    seoKeywords: p.seoKeywords
  }));

  fs.writeFileSync('blog_export_with_translations.json', JSON.stringify(exportData, null, 2));
  console.log('');
  console.log('=== ALL DONE ===');
  console.log(`Exported 3 posts (EN + HI + GU) to blog_export_with_translations.json`);
  console.log('');
  console.log('Next step: Upload this JSON to your production server and import it.');

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
