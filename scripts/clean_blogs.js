const fs = require('fs');
const path = require('path');

const blogsDir = path.join(__dirname, '../../blogs');

function cleanBlog(filename) {
    const filePath = path.join(blogsDir, filename);
    let content = fs.readFileSync(filePath, 'utf8');

    // It has two frontmatters now. Remove all frontmatters and start fresh.
    // A frontmatter is between --- and ---
    let matches = [...content.matchAll(/---\r?\n([\s\S]*?)\r?\n---\r?\n/g)];
    
    // The second match is the original one
    // Let's just remove all blocks of --- ... --- at the start
    while (content.startsWith('---')) {
        content = content.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
    }

    // Now re-run the optimization
    fs.writeFileSync(filePath, content, 'utf8');
}

const files = fs.readdirSync(blogsDir);
files.forEach(f => {
    if (f.match(/^Week[2-4]_Blog([4-9]|1[0-2])\.md$/)) {
        cleanBlog(f);
    }
});

console.log("Cleanup complete.");
