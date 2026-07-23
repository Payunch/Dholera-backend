const fs = require('fs');
const sequelize = require(process.cwd() + '/config/database');
const Update = require(process.cwd() + '/models/Update');

async function run() {
    try {
        const filePath = '/tmp/Week2_Blog6.md';
        const content = fs.readFileSync(filePath, 'utf8');

        const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
        const metaStr = match[1];
        let meta = {};
        metaStr.split('\n').forEach(line => {
            if (!line.includes(':')) return;
            const [key, ...rest] = line.split(':');
            let value = rest.join(':').trim();
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            meta[key.trim()] = value;
        });

        const body = content.slice(match[0].length);
        let htmlContent = body
            .replace(/^#\s+(.*)$/gm, '<h1>$1</h1>')
            .replace(/^##\s+(.*)$/gm, '<h2>$1</h2>')
            .replace(/^###\s+(.*)$/gm, '<h3>$1</h3>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\n\n/g, '<br><br>');

        await sequelize.authenticate();
        const localPost = await Update.create({
            title: meta.title || meta.meta_title || 'Week2 Blog6',
            content: htmlContent,
            category: meta.category || 'Investment',
            imageUrl: '/uploads/dholera_blog_image.png',
            imagePosition: 'top',
            published: true,
            publishedAt: new Date(),
            lang: 'en',
            author: 'Dholera Admin'
        });
        console.log('Inserted via Sequelize on remote server with ID:', localPost.id);
    } catch (e) {
        console.error('Error inserting:', e);
    }
}
run();
