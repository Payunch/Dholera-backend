const fs = require('fs');

const file = 'controllers/leadsController.js';
let content = fs.readFileSync(file, 'utf8');

// The limiters need to be restored to });
content = content.replace(/const otpLimiter = rateLimit\(\{([\s\S]*?)legacyHeaders: false,\n\};/g, 'const otpLimiter = rateLimit({$1legacyHeaders: false,\n});');
content = content.replace(/const formLimiter = rateLimit\(\{([\s\S]*?)legacyHeaders: false,\n\};/g, 'const formLimiter = rateLimit({$1legacyHeaders: false,\n});');
content = content.replace(/const onboardRateLimiter = rateLimit\(\{([\s\S]*?)legacyHeaders: false,\n  message: \{ error: 'Too many onboarding attempts from this IP, please try again later\.' \}\n\};/g, "const onboardRateLimiter = rateLimit({$1legacyHeaders: false,\n  message: { error: 'Too many onboarding attempts from this IP, please try again later.' }\n});");

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed leadsController limiters');
