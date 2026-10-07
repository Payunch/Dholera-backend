const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'services', 'autoBlogService.js');
let content = fs.readFileSync(filePath, 'utf8');

const t1 = `Respond strictly in JSON format without markdown wrapping, like this:
{
  "title": "SEO Optimized Blog Title",
  "content": "The full HTML content of the blog post...",
  "category": "News",
  "tags": "tag1, tag2, tag3",
  "seoTitle": "...",
  "seoDescription": "...",
  "seoKeywords": "..."
}
\`;`;

const r1 = `Respond strictly in JSON format without markdown wrapping, like this:
{
  "title_en": "SEO Optimized Blog Title (English)",
  "title_gu": "SEO Optimized Blog Title (Gujarati)",
  "title_hi": "SEO Optimized Blog Title (Hindi)",
  "content_en": "The full HTML content of the blog post (English)...",
  "content_gu": "The full HTML content of the blog post (Gujarati)...",
  "content_hi": "The full HTML content of the blog post (Hindi)...",
  "category": "News",
  "tags": "tag1, tag2, tag3",
  "seoTitle": "...",
  "seoDescription": "...",
  "seoKeywords": "..."
}
\`;`;

const t2 = `        if (blogData) {
          blogData.content = normalizeInternalLinks(blogData.content);
          console.log(\`[AutoBlog] Blog post generated. Title: \${blogData.title}\`);

          if (hasUnsafeAdvertisingClaims(blogData.content)) {
            console.warn('[AutoBlog] Generated copy failed the advertising-claims safety gate. Draft not saved.');
            outcomes.push(\`\${item.title}: rejected by local advertising-claims safety gate\`);
            continue;
          }`;

const r2 = `        if (blogData) {
          blogData.title = blogData.title_en || blogData.title;
          blogData.content = blogData.content_en || blogData.content;
          blogData.content = normalizeInternalLinks(blogData.content);
          if (blogData.content_gu) blogData.content_gu = normalizeInternalLinks(blogData.content_gu);
          if (blogData.content_hi) blogData.content_hi = normalizeInternalLinks(blogData.content_hi);
          
          console.log(\`[AutoBlog] Blog post generated. Title: \${blogData.title}\`);

          if (hasUnsafeAdvertisingClaims(blogData.content)) {
            console.warn('[AutoBlog] Generated copy failed the advertising-claims safety gate. Draft not saved.');
            outcomes.push(\`\${item.title}: rejected by local advertising-claims safety gate\`);
            continue;
          }`;

const t3 = `          const ctaHtml = \`\\n\\n<div style="background: #eef2f7; padding: 20px; margin-top: 30px; border-radius: 5px; text-align: center;">
  <h3>Ready to Explore Dholera Smart City?</h3>
  <p><a href="https://www.dholeraplatform.com/contact" style="font-weight: bold; color: #0056b3; text-decoration: none;">Contact the Dholera Platform team</a> for project-specific questions and independent verification.</p>
</div>\`;
          if (!isAppNews) blogData.content += ctaHtml;`;

const r3 = `          const ctaHtmlEn = \`\\n\\n<div style="background: #eef2f7; padding: 20px; margin-top: 30px; border-radius: 5px; text-align: center;">
  <h3>Ready to Explore Dholera Smart City?</h3>
  <p><a href="https://www.dholeraplatform.com/contact" style="font-weight: bold; color: #0056b3; text-decoration: none;">Contact the Dholera Platform team</a> for project-specific questions and independent verification.</p>
</div>\`;
          const ctaHtmlGu = \`\\n\\n<div style="background: #eef2f7; padding: 20px; margin-top: 30px; border-radius: 5px; text-align: center;">
  <h3>ધોલેરા સ્માર્ટ સિટી વિશે વધુ જાણવા માટે તૈયાર છો?</h3>
  <p>પ્રોજેક્ટ સંબંધિત પ્રશ્નો અને સ્વતંત્ર ચકાસણી માટે <a href="https://www.dholeraplatform.com/contact" style="font-weight: bold; color: #0056b3; text-decoration: none;">ધોલેરા પ્લેટફોર્મ ટીમનો સંપર્ક કરો</a>.</p>
</div>\`;
          const ctaHtmlHi = \`\\n\\n<div style="background: #eef2f7; padding: 20px; margin-top: 30px; border-radius: 5px; text-align: center;">
  <h3>धोलेरा स्मार्ट सिटी के बारे में अधिक जानने के लिए तैयार हैं?</h3>
  <p>परियोजना-विशिष्ट प्रश्नों और स्वतंत्र सत्यापन के लिए <a href="https://www.dholeraplatform.com/contact" style="font-weight: bold; color: #0056b3; text-decoration: none;">धोलेरा प्लेटफॉर्म टीम से संपर्क करें</a>।</p>
</div>\`;

          if (!isAppNews) {
             blogData.content += ctaHtmlEn;
             if (blogData.content_gu) blogData.content_gu += ctaHtmlGu;
             if (blogData.content_hi) blogData.content_hi += ctaHtmlHi;
          }`;

const t4 = `          // 5. Save to Database as Draft (Pending Approval)
          const newUpdate = await Update.create({
            title: blogData.title,
            content: blogData.content,
            category: isAppNews ? 'App News' : (blogData.category || 'News'),
            published: false, // Save as unpublished so Admin must approve it
            isApproved: false, // Explicitly mark as pending approval
            imageUrl: imageUrl,
            imagePosition: 'top',
            publishedAt: new Date(),
            lang: 'en',
            author,
            isExclusive: isAppNews,
            tags: blogData.tags,
            seoTitle: blogData.seoTitle,
            seoDescription: blogData.seoDescription,
            seoKeywords: blogData.seoKeywords
          });`;

const r4 = `          // 5. Save to Database as Draft (Pending Approval)
          const newUpdate = await Update.create({
            title: blogData.title,
            content: blogData.content,
            title_gu: blogData.title_gu,
            content_gu: blogData.content_gu,
            title_hi: blogData.title_hi,
            content_hi: blogData.content_hi,
            category: isAppNews ? 'App News' : (blogData.category || 'News'),
            published: false, // Save as unpublished so Admin must approve it
            isApproved: false, // Explicitly mark as pending approval
            imageUrl: imageUrl,
            imagePosition: 'top',
            publishedAt: new Date(),
            lang: 'en',
            author,
            isExclusive: isAppNews,
            tags: blogData.tags,
            seoTitle: blogData.seoTitle,
            seoDescription: blogData.seoDescription,
            seoKeywords: blogData.seoKeywords
          });`;

const safeReplace = (target, replacement) => {
  if (content.includes(target)) {
    content = content.replace(target, replacement);
  } else {
    const targetWin = target.replace(/\\n/g, '\\r\\n');
    if (content.includes(targetWin)) {
      content = content.replace(targetWin, replacement);
    } else {
      console.error('Could not find target:\\n', target);
    }
  }
};

safeReplace(t1, r1);
safeReplace(t2, r2);
safeReplace(t3, r3);
safeReplace(t4, r4);

fs.writeFileSync(filePath, content);
console.log('autoBlogService.js updated successfully');
