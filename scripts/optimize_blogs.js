const fs = require('fs');
const path = require('path');

const blogsDir = path.join(__dirname, '../../blogs');

const stopWords = ['a','an','and','are','as','at','be','by','for','from','has','he','in','is','it','its','of','on','that','the','to','was','were','will','with'];

function slugify(text) {
    return text.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .split(/\s+/)
        .filter(w => w && !stopWords.includes(w))
        .join('-');
}

function processBlog(filename) {
    const filePath = path.join(blogsDir, filename);
    let content = fs.readFileSync(filePath, 'utf8');

    // Extract H1 for title
    let titleMatch = content.match(/^#\s+(.+)$/m);
    let originalTitle = titleMatch ? titleMatch[1] : filename.replace('.md', '');
    
    // Remove YAML frontmatter if it exists to rewrite it (just in case)
    while (content.startsWith('---')) {
        content = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
    }
    
    // Convert multiple H1s to H2s (except the first one)
    let h1Count = 0;
    content = content.replace(/^#\s+(.+)$/gm, (match, p1) => {
        h1Count++;
        if (h1Count > 1) return `## ${p1}`;
        return match;
    });
    
    const focusKeyword = originalTitle.split(' ').slice(0, 4).join(' ').toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const slug = slugify(originalTitle);
    const metaDescription = `Discover essential insights on ${originalTitle.substring(0, 80)}. Learn why smart investors are turning to Dholera SIR for massive growth potential.`;
    
    // Fix images
    content = content.replace(/<img.*?src="(.*?)".*?>/g, (match, url) => `![image](${url})`); // revert first if they were img tags
    content = content.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, url) => {
        let cleanAlt = alt === 'image' ? focusKeyword : alt;
        return `<img src="${url}" alt="${focusKeyword} - ${cleanAlt}" title="${originalTitle}" loading="lazy" />`;
    });

    // Add FAQ if missing
    if (!content.includes('## FAQ') && !content.includes('## Frequently Asked Questions')) {
        content += `\n\n## FAQ\n\n**Q1: What makes Dholera a smart city?**\nA: Dholera SIR is India's first platinum-rated greenfield smart city, featuring 100% underground utilities, smart water management, and a central command center for civic amenities.\n\n**Q2: Is investing in Dholera safe?**\nA: Yes, it is backed by both State and Central governments under the DMIC project with strict zoning laws ensuring long-term appreciation.\n`;
    }

    // Add Conclusion if missing
    if (!content.includes('## Conclusion')) {
        content += `\n\n## Conclusion\n\nIn conclusion, understanding the dynamics of ${focusKeyword} is critical for making informed real estate decisions. Dholera SIR presents an unmatched opportunity for capital appreciation and long-term wealth generation. Don't wait until the city is fully built—explore these investment avenues today.\n`;
    }

    const frontmatter = `---
seo_title: "${originalTitle.substring(0, 60)}"
meta_description: "${metaDescription}"
slug: "${slug}"
focus_keyword: "${focusKeyword}"
category: "Investment"
tags: ["Dholera", "Real Estate", "Smart City", "Investment"]
schema: "BlogPosting"
---
`;

    fs.writeFileSync(filePath, frontmatter + content, 'utf8');
    console.log(`Optimized ${filename}`);
}

const files = fs.readdirSync(blogsDir);
files.forEach(f => {
    if (f.match(/^Week[2-4]_Blog([4-9]|1[0-2])\.md$/)) {
        processBlog(f);
    }
});

console.log("Optimization complete.");
