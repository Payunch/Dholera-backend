const fs = require('fs');
const path = require('path');

const routesDir = path.join(__dirname, '..', 'routes');
const routeFiles = fs.readdirSync(routesDir).filter(f => f.endsWith('.js'));

const mounts = [
  { path: '/api/leads', file: 'leads.js' },
  { path: '/api/updates', file: 'updates.js' },
  { path: '/api/content/updates', file: 'updates.js', alias: true },
  { path: '/api/analytics', file: 'analytics.js' },
  { path: '/api/auth', file: 'auth.js' },
  { path: '/api/user-auth', file: 'userAuth.js' },
  { path: '/api/pdf', file: 'pdf.js' },
  { path: '/api/payment', file: 'payment.js' },
  { path: '/api/bi', file: 'bi.js' },
  { path: '/api/whatsapp', file: 'whatsapp.js' },
  { path: '/api/settings', file: 'settings.js' },
  { path: '/api/clearance', file: 'clearance.js' },
  { path: '/api/admin', file: 'admin.js' },
  { path: '/api/preferences', file: 'preferences.js' },
  { path: '/api/content', file: 'content.js' },
  { path: '/api/intelligence', file: 'intelligence.js' },
  { path: '/api/tblmng', file: 'tblmng.js' },
  { path: '/api/user', file: 'user.js' },
  { path: '/api/generalsetting', file: 'generalsettings.js' },
  { path: '/api/invoicesetting', file: 'generalsettings.js', alias: true },
  { path: '/api/defaultentrysetting', file: 'generalsettings.js', alias: true },
  { path: '/api/import', file: 'import.js' }
];

let markdown = `# Express API Map (V6)\n\nThis document outlines the API flows for the Dholera-backend, distinguishing all 22 mounted route aliases and their respective controller files.\n\n`;

for (const mount of mounts) {
  const content = fs.readFileSync(path.join(routesDir, mount.file), 'utf8');
  markdown += `## Mounted Route: \`${mount.path}\`\n`;
  if (mount.alias) {
    markdown += `*Alias of: \`${mount.file}\`*\n\n`;
  } else {
    markdown += `*Controller Module: \`${mount.file}\`*\n\n`;
  }
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

fs.writeFileSync(path.join(__dirname, 'api-map-generated-v2.md'), markdown);
console.log('API Map generated at api-map-generated-v2.md');
