const fs = require('fs');

const file = 'controllers/leadsController.js';
let content = fs.readFileSync(file, 'utf8');

// Replace all closing tags for exports functions
content = content.replace(/^}\);/gm, '};');

// Fix specific save-direct
content = content.replace(/return router\.handle\(req, res\);/g, 'return exports.onboardLead(req, res);');

// Remove rate limiters that are now in route file
content = content.replace(/const rateLimit = require\('express-rate-limit'\);\n/g, '');
content = content.replace(/\/\/ Rate Limiters[\s\S]*?legacyHeaders: false,\n\};\n/g, '');
content = content.replace(/const onboardRateLimiter = rateLimit\(\{[\s\S]*?\}\);\n/g, '');
// Note: rateLimit block closing is now `};` because of the first replace.
content = content.replace(/const onboardRateLimiter = rateLimit\(\{[\s\S]*?\};\n/g, '');
content = content.replace(/const formLimiter = rateLimit\(\{[\s\S]*?\};\n/g, '');
content = content.replace(/const otpLimiter = rateLimit\(\{[\s\S]*?\};\n/g, '');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed leadsController');
