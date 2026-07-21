const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const blogsDir = path.join(__dirname, '../../blogs');

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    console.error("Please set OPENAI_API_KEY in your .env file.");
    process.exit(1);
}

const promptTemplate = (content, filename) => `
You are an expert WordPress SEO publisher. Your task is to rewrite and expand the following blog post to achieve a Rank Math SEO score of 90-100.

IMPORTANT RULES:
1. Target Word Count: Expand the text to be between 1200 and 1500 words. Do not write filler; add valuable insights about real estate, smart cities, and investment.
2. Focus Keyword: Pick EXACTLY ONE focus keyword. Ensure it is in the first paragraph naturally.
3. Keyword Density: Keep the keyword density around 1%. Do not keyword stuff.
4. Title: Create an SEO-friendly title (50-60 characters) with a number or power word, and the keyword near the beginning.
5. URL Slug: Short, lowercase, hyphen-separated, no stop words, containing the keyword.
6. Meta Description: 140-160 characters, highly clickable, containing the keyword.
7. Headings: EXACTLY ONE H1. Multiple H2s. H3s where needed. No skipped levels.
8. Table of Contents: Insert "## Table of Contents" after the introduction with markdown links.
9. FAQ: Add an FAQ section with 4-8 questions at the end.
10. Readability: Short paragraphs (max 3-4 lines). Short sentences. Active voice. Use transition words. Use bullet/numbered lists.
11. Images: Convert any existing markdown images to HTML tags: <img src="URL" alt="FOCUS KEYWORD - image description" title="TITLE" loading="lazy" />
12. Links: Add placeholders for 3-5 internal links (e.g., [Internal Link Text](/internal-link)). Add 2-3 authority external links (e.g., Wikipedia, Google, OpenAI, Official Govt Sites) with target="_blank".

Return the response EXACTLY in this format:

---
seo_title: "YOUR_TITLE"
meta_description: "YOUR_META_DESCRIPTION"
slug: "your-slug"
focus_keyword: "your focus keyword"
category: "Investment"
tags: ["Tag1", "Tag2", "Tag3", "Tag4", "Tag5"]
schema: "Article, FAQ"
featured_image: "USE_FIRST_IMAGE_URL_HERE_OR_EMPTY"
---

# YOUR H1 TITLE

[Your expanded markdown content with HTML image tags and all requested structures...]

ORIGINAL CONTENT TO REWRITE:
${content}
`;

async function rewriteBlog(filename) {
    const filePath = path.join(blogsDir, filename);
    const content = fs.readFileSync(filePath, 'utf8');

    console.log(`Sending ${filename} to OpenAI for SEO expansion...`);

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o', // or gpt-4-turbo
                messages: [
                    { role: 'system', content: 'You are an expert SEO content writer.' },
                    { role: 'user', content: promptTemplate(content, filename) }
                ],
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const err = await response.text();
            console.error(`OpenAI API error for ${filename}:`, err);
            return;
        }

        const data = await response.json();
        const rewrittenContent = data.choices[0].message.content;

        fs.writeFileSync(filePath, rewrittenContent, 'utf8');
        console.log(`Successfully rewrote and expanded ${filename}!`);
    } catch (e) {
        console.error(`Failed to process ${filename}:`, e);
    }
}

async function processAll() {
    const files = fs.readdirSync(blogsDir);
    for (let f of files) {
        if (f.match(/^Week[2-4]_Blog([4-9]|1[0-2])\.md$/)) {
            // Uncomment to run on all. For safety, let's just do one at a time if the user runs it.
            // await rewriteBlog(f);
        }
    }
    console.log("To process all files, uncomment the execution line in processAll().");
    console.log("Usage: node scripts/rankmath_optimizer.js <filename> (e.g. Week2_Blog4.md)");
}

const targetFile = process.argv[2];
if (targetFile) {
    rewriteBlog(targetFile);
} else {
    processAll();
}
