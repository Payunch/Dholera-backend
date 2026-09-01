const fs = require('fs');
const path = require('path');
const sequelize = require('../config/database');
const Update = require('../models/Update');
// Node 18+ has built-in fetch

const blogsDir = path.join(__dirname, '../../blogs');

function parseFrontmatter(content) {
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
    if (!match) return { meta: {}, body: content };
    
    const lines = match[1].split('\n');
    const meta = {};
    for (let line of lines) {
        if (!line.includes(':')) continue;
        const [key, ...rest] = line.split(':');
        let value = rest.join(':').trim();
        if (value.startsWith('"') && value.endsWith('"')) {
            value = value.slice(1, -1);
        } else if (value.startsWith('[') && value.endsWith(']')) {
            value = value.slice(1, -1).split(',').map(s => s.trim().replace(/^"|"$/g, ''));
        }
        meta[key.trim()] = value;
    }
    return {
        meta,
        body: content.slice(match[0].length)
    };
}

async function publishNextBlog() {
    console.log("Starting daily publisher...");
    
    // Find next unpublished blog
    const files = fs.readdirSync(blogsDir).sort();
    let blogToPublish = null;
    let blogData = null;

    for (let file of files) {
        if (file.endsWith('.md')) {
            const filePath = path.join(blogsDir, file);
            const content = fs.readFileSync(filePath, 'utf8');
            const { meta, body } = parseFrontmatter(content);
            
            if (meta.published !== 'true') {
                blogToPublish = { file, filePath, content, meta, body };
                break;
            }
        }
    }

    if (!blogToPublish) {
        console.log("No unpublished blogs found.");
        process.exit(0);
    }

    console.log(`Found unpublished blog: ${blogToPublish.file}`);

    // Parse Markdown to simple HTML (basic implementation for automation)
    // Replace markdown headings, bold, images
    let htmlContent = blogToPublish.body
        .replace(/^#\s+(.*)$/gm, '<h1>$1</h1>')
        .replace(/^##\s+(.*)$/gm, '<h2>$1</h2>')
        .replace(/^###\s+(.*)$/gm, '<h3>$1</h3>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '<br><br>');
    
    // Publish to Local DB
    try {
        await sequelize.authenticate();
        console.log("Connected to SQLite DB.");
        const localPost = await Update.create({
            title: blogToPublish.meta.seo_title || blogToPublish.file,
            content: htmlContent,
            category: blogToPublish.meta.category || "Investment",
            imageUrl: "/uploads/dholera_blog_image.png", // fallback or use the first image in post
            imagePosition: "top",
            // Automation may prepare content, but an administrator must make
            // the final editorial and factual publishing decision.
            published: false,
            isApproved: false,
            publishedAt: new Date(),
            lang: "en",
            author: "Dholera Admin",
            tags: (blogToPublish.meta.tags || []).join(', '),
            seoTitle: blogToPublish.meta.seo_title,
            seoDescription: blogToPublish.meta.meta_description,
            seoKeywords: blogToPublish.meta.focus_keyword
        });
        console.log("Blog post published to local SQLite successfully with ID:", localPost.id);
    } catch(e) {
        console.error("Error publishing to local DB:", e);
    }

    // Publish to WordPress
    const wpUrl = process.env.WP_URL;
    const wpUser = process.env.WP_USERNAME;
    const wpPass = process.env.WP_APP_PASSWORD;

    if (wpUrl && wpUser && wpPass) {
        try {
            console.log("Publishing to WordPress...");
            const token = Buffer.from(`${wpUser}:${wpPass}`).toString('base64');
            const response = await fetch(`${wpUrl}/wp-json/wp/v2/posts`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${token}`
                },
                body: JSON.stringify({
                    title: blogToPublish.meta.seo_title,
                    content: htmlContent,
                    status: 'draft',
                    // Focus keywords and meta can be passed in meta properties for Yoast/RankMath
                    meta: {
                        rank_math_focus_keyword: blogToPublish.meta.focus_keyword || "",
                        rank_math_description: blogToPublish.meta.meta_description || "",
                        rank_math_title: blogToPublish.meta.seo_title || ""
                    },
                    // Featured image could be set if you resolve the ID in WP
                    // featured_media: WP_IMAGE_ID
                })
            });

            if (response.ok) {
                const wpData = await response.json();
                console.log("Published to WordPress with ID:", wpData.id);
            } else {
                console.error("WordPress publish failed:", await response.text());
            }
        } catch(e) {
            console.error("Error publishing to WordPress:", e);
        }
    } else {
        console.log("WordPress credentials missing in .env, skipping WP publish.");
    }

    // Mark as published
    const newContent = blogToPublish.content.replace(/^---\r?\n/, '---\npublished: "true"\n');
    fs.writeFileSync(blogToPublish.filePath, newContent, 'utf8');
    console.log(`Marked ${blogToPublish.file} as published.`);

    process.exit(0);
}

// Ensure ENV is loaded if this runs via standard node execution
require('dotenv').config({ path: path.join(__dirname, '../.env') });
publishNextBlog();
