const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'services', 'autoBlogService.js');
let content = fs.readFileSync(filePath, 'utf8');

// Replace Prompt
content = content.replace(/Respond strictly in JSON format without markdown wrapping, like this:\s*\{\s*"title":\s*"SEO Optimized Blog Title",\s*"content":\s*"The full HTML content of the blog post\.\.\.",\s*"category":\s*"News",\s*"tags":\s*"tag1, tag2, tag3",\s*"seoTitle":\s*"\.\.\.",\s*"seoDescription":\s*"\.\.\.",\s*"seoKeywords":\s*"\.\.\."\s*\}\s*`;/, 
`Respond strictly in JSON format without markdown wrapping, like this:
{
  "title_en": "SEO Optimized Blog Title",
  "title_gu": "SEO Optimized Blog Title in Gujarati",
  "title_hi": "SEO Optimized Blog Title in Hindi",
  "content_en": "The full HTML content of the blog post...",
  "content_gu": "The full HTML content of the blog post in Gujarati...",
  "content_hi": "The full HTML content of the blog post in Hindi...",
  "category": "News",
  "tags": "tag1, tag2, tag3",
  "seoTitle": "...",
  "seoDescription": "...",
  "seoKeywords": "..."
}
\`;`);

// Replace CTAs
content = content.replace(/const ctaHtml = `[\s\S]*?Ready to Explore Dholera Smart City\?[\s\S]*?<\/div>`;\s*if \(!isAppNews\) blogData\.content \+= ctaHtml;/, 
`const ctaHtmlEn = \`\\n\\n<div style="background: #eef2f7; padding: 20px; margin-top: 30px; border-radius: 5px; text-align: center;">
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
          }`);

// Replace Update.create
content = content.replace(/const newUpdate = await Update\.create\(\{\s*title: blogData\.title,\s*content: blogData\.content,/,
`const newUpdate = await Update.create({
            title: blogData.title,
            content: blogData.content,
            title_gu: blogData.title_gu,
            content_gu: blogData.content_gu,
            title_hi: blogData.title_hi,
            content_hi: blogData.content_hi,`);

fs.writeFileSync(filePath, content);
console.log('done replacing');
