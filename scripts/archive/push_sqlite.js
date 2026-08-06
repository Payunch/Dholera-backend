const { Sequelize } = require('sequelize');
const fs = require('fs');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './data/database.sqlite',
  logging: false
});

async function pushBlog(content, title) {
    try {
        const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
        const metaStr = match[1];
        let meta = {};
        metaStr.split('\n').forEach(line => {
            if (!line.includes(':')) return;
            const [key, ...rest] = line.split(':');
            let value = rest.join(':').trim();
            if (value.startsWith('\x22') && value.endsWith('\x22')) value = value.slice(1, -1);
            meta[key.trim()] = value;
        });

        const body = content.slice(match[0].length);
        let htmlContent = body
            .replace(/^#\s+(.*)$/gm, '<h1></h1>')
            .replace(/^##\s+(.*)$/gm, '<h2></h2>')
            .replace(/^###\s+(.*)$/gm, '<h3></h3>')
            .replace(/\*\*(.*?)\*\*/g, '<strong></strong>')
            .replace(/\n\n/g, '<br><br>');

        await sequelize.query(
            'INSERT INTO Updates (title, content, category, published, imageUrl, imagePosition, author, lang, publishedAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime(\'now\'), datetime(\'now\'), datetime(\'now\'))',
            {
                replacements: [
                    title,
                    htmlContent,
                    meta.category || 'Investment',
                    1,
                    '/uploads/dholera_blog_image.png',
                    'top',
                    'Dholera Admin',
                    'en'
                ]
            }
        );
        console.log('Inserted: ' + title);
    } catch(e) {
        console.error(e);
    }
}
module.exports = pushBlog;
