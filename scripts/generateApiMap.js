const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '..', 'routes');
const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

let markdown = '# Complete Express API Map\n\n';

for (const file of routeFiles) {
  const content = fs.readFileSync(path.join(routesDir, file), 'utf8');
  const group = file.replace('.js', '');
  markdown += `## Group: \`/api/${group}\`\n\n`;
  markdown += `| Method | Endpoint | Middleware / Auth | Controller / Service | Description / Notes |\n`;
  markdown += `|---|---|---|---|---|\n`;

  const routeRegex = /router\.(get|post|put|delete|patch)\(['"](.*?)['"]\s*,(.*?)\);/g;
  let match;
  while ((match = routeRegex.exec(content)) !== null) {
    const method = match[1].toUpperCase();
    const endpoint = match[2];
    const handlers = match[3].split(',').map(s => s.trim());
    
    const controller = handlers.pop();
    const middleware = handlers.length > 0 ? handlers.join(', ') : 'None';
    
    markdown += `| ${method} | ${endpoint} | ${middleware} | ${controller} | |\n`;
  }
  
  markdown += '\n';
}

fs.writeFileSync(path.join(__dirname, 'api-map-generated.md'), markdown);
console.log('API Map generated at api-map-generated.md');
