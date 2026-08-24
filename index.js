const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

// ==========================================
// PRIORITY 3: GLOBAL CRASH PREVENTION
// ==========================================
process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught Exception:', err);
  console.error('Stack Trace:', err.stack);
  // Keep server alive, do not exit process
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled Rejection at:', promise);
  console.error('Reason:', reason);
  // Keep server alive, do not exit process
});
// ==========================================

const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const csurf = require('csurf');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { sequelize, PdfDocument, AutoBlogRun } = require('./models');
const { testConnection, getDatabaseInfo } = require('./config/database');
const { buildOriginMatcher } = require('./utils/originMatcher');
const { seedPdfsIfEmpty } = require('./scripts/seed_cloudinary_pdfs');
const { seedBlogIfEmpty } = require('./scripts/seed_blog_startup');
const BackupService = require('./services/backupService');
const autoBlogService = require('./services/autoBlogService');
const { publishDraftToLive } = require('./services/liveBlogPublisher');
const { initializeWhatsAppWebhooks } = require('./services/whatsappWebhook');
const { verifyAccessToken } = require('./services/adminSecurity');
const cron = require('node-cron');

const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      if (originMatcher.isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  }
});

// Attach io to app so routes can access it
app.set('io', io);

io.on('connection', (socket) => {
  socket.on('join_lead', (leadToken) => {
    socket.join(`lead_${leadToken}`);
    console.log(`[Socket] Lead joined channel: lead_${leadToken.substring(0, 8)}...`);
  });

  socket.on('join_admin', () => {
    // Note: in a real app, verify admin session before joining admin channel
    socket.join('admin_alerts');
    console.log('[Socket] Admin joined alert channel');
  });
});

const bootAt = new Date().toISOString();

// Build the origin matcher from configured sources. Prefer an explicit
// `ALLOWED_ORIGINS` env var but also include `VITE_SITE_URL` when present
// so frontend deployments that set that variable work without an extra
// ALLOWED_ORIGINS edit in the environment.
const allowedSources = [];
if (process.env.ALLOWED_ORIGINS) allowedSources.push(process.env.ALLOWED_ORIGINS);
if (process.env.VITE_SITE_URL) allowedSources.push(process.env.VITE_SITE_URL);
const originMatcher = buildOriginMatcher(allowedSources.join(','));
const allowedOrigins = originMatcher.allowedOrigins;

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000, // Increased from 500 to accommodate frequent tracking pings
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});

// Middleware
app.set('trust proxy', 1);
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(cors({
  origin: (origin, callback) => {
    // Allow same-origin (no origin), local development, exact matches, and wildcard allowlist entries.
    if (originMatcher.isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    console.warn(`[CORS] Blocked origin: ${origin}`);
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'X-CSRF-Token', 'X-Firebase-AppCheck']
}));
app.use(globalLimiter);
app.use(express.json({ limit: '20mb' })); // Allow large rich-text posts and editor payloads
app.use(express.urlencoded({ extended: true, limit: '20mb' }));
app.use(morgan('dev'));
app.use(cookieParser());

// Ensure required directories exist
const fs = require('fs');
const uploadsDir = path.join(__dirname, 'uploads');
const imagesDir = path.join(uploadsDir, 'images');
[uploadsDir, imagesDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Session store: use PostgreSQL for persistent sessions in production
let sessionStore = undefined;
if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
  try {
    const pgSession = require('connect-pg-simple')(session);
    sessionStore = new pgSession({
      conString: process.env.DATABASE_URL,
      tableName: 'UserSessions_Store', // Custom table name to avoid conflict with model
      createTableIfMissing: true
    });
    console.log('[Session] Using PostgreSQL persistent store');
  } catch (err) {
    console.error('[Session] Failed to initialize Postgres store:', err.message);
  }
} else if (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.includes('sqlite')) {
  try {
    const SQLiteStore = require('connect-sqlite3')(session);
    const { getDatabaseInfo } = require('./config/database');
    const dbInfo = getDatabaseInfo();

    // Use the same directory as the main database for the session store
    let sessionDir = dbInfo.storagePath ? path.dirname(dbInfo.storagePath) : __dirname;

    // Final check for sessionDir writability
    try {
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }
      fs.accessSync(sessionDir, fs.constants.W_OK);
    } catch (err) {
      console.warn(`[Session] Warning: ${sessionDir} is not writable, falling back to OS temp dir.`);
      sessionDir = require('os').tmpdir();
    }

    sessionStore = new SQLiteStore({
      db: 'sessions.sqlite',
      dir: sessionDir,
      concurrentDB: true
    });
    console.log(`[Session] Using SQLite persistent store at ${path.join(sessionDir, 'sessions.sqlite')}`);
  } catch (err) {
    console.error('[Session] Failed to initialize SQLite store:', err.message);
  }
} else {
  console.warn('PostgreSQL not detected: using in-memory session store (not suitable for production)');
}

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET;
if (!SESSION_SECRET) {
  throw new Error('CRITICAL: SESSION_SECRET or JWT_SECRET must be set in environment variables.');
}
const isProd = process.env.NODE_ENV === 'production';
let cookieDomain = process.env.COOKIE_DOMAIN;
if (!cookieDomain && isProd) {
  cookieDomain = '.dholeraplatform.com';
}

app.use(session({
  store: sessionStore,
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProd, // Only secure in production to allow local HTTP testing
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    ...(cookieDomain && { domain: cookieDomain })
  }
}));

// Request logger for debugging (Moved after session middleware)
app.use((req, res, next) => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  }
  next();
});

const csrfProtection = csurf();

// Apply CSRF only to admin/session-protected mutations.
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'test') return next();

  const isSafeMethod = req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS';
  if (isSafeMethod) return next();

  const isAuthMutation = req.path === '/api/auth/login' || req.path === '/api/auth/logout';

  // FIXED: Explicitly exclude login from CSRF during the credential check phase
  // CSRF is still enforced for all other admin mutations via the logic below.
  if (isAuthMutation) return next();

  const isAdminSessionMutation = Boolean(req.session?.isAdmin || req.cookies?.admin_access_token || req.cookies?.admin_refresh_token);
  const isPublicPath = [
    '/api/leads',
    '/api/leads/onboard',
    '/api/leads/save-direct',
    '/api/leads/track-returning',
    '/api/leads/verify-otp',
    '/api/analytics/track'
  ].includes(req.path);

  // DELETE/PUT/POST endpoints for updates are protected by CORS preflight and verifyToken (JWT).
  // We only bypass csurf here if the request explicitly uses a Bearer token (cross-domain integration).
  // If it relies on ambient session cookies, CSRF protection MUST be enforced.
  const isSafeDelete = req.method === 'DELETE' && req.path.startsWith('/api/leads/');
  
  const hasBearerToken = req.headers.authorization && req.headers.authorization.startsWith('Bearer ');
  let isBearerValid = false;
  if (hasBearerToken) {
    try {
      verifyAccessToken(req.headers.authorization.split(' ')[1]);
      isBearerValid = true;
    } catch (e) {}
  }
  const isSafeUpdateMutation = (req.method === 'PUT' || req.method === 'POST' || req.method === 'DELETE') && req.path.startsWith('/api/updates') && isBearerValid;

  const isPublicMutation = isPublicPath || isSafeDelete || isSafeUpdateMutation;

  if (isAdminSessionMutation && !isPublicMutation) {
    return csrfProtection(req, res, next);
  }
  return next();
});

// Helper endpoint for frontend to fetch the CSRF token (establishes session cookie)
app.get('/api/auth/csrf-token', csrfProtection, (req, res) => {
  try {
    return res.json({ csrfToken: req.csrfToken() });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to generate CSRF token' });
  }
});
app.use('/uploads', (req, res, next) => {
  if (req.path.endsWith('.pdf')) {
    return res.status(403).json({ error: 'Direct PDF access is forbidden. Use secure viewer.' });
  }
  next();
}, express.static(path.join(__dirname, 'uploads')));

app.get('/healthz', (req, res) => {
  res.json({ ok: true, service: 'dholera-backend' });
});

// Global /api/track endpoint to prevent 404s
app.post('/api/track', (req, res) => {
  res.status(204).end();
});

app.get('/healthz/runtime', async (req, res) => {
  const configuredPort = Number.parseInt(process.env.PORT || '3000', 10);
  const lastAutoBlogRun = await AutoBlogRun.findOne({
    attributes: ['startedAt', 'completedAt', 'status', 'updateId'],
    order: [['startedAt', 'DESC']],
    raw: true
  }).catch(() => null);
  res.json({
    ok: true,
    service: 'dholera-backend',
    bootAt,
    pid: process.pid,
    nodeEnv: process.env.NODE_ENV || 'development',
    configuredPort,
    database: getDatabaseInfo(),
    allowedOrigins,
    exactAllowedOrigins: originMatcher.exactOrigins,
    wildcardAllowedOrigins: originMatcher.wildcardOrigins,
    uptimeSec: Math.round(process.uptime()),
    autoBlog: {
      schedule: AUTO_BLOG_CRON,
      timezone: AUTO_BLOG_TIMEZONE,
      lastRun: lastAutoBlogRun
    }
  });
});

// Routes
app.use('/api/leads', require('./routes/leads'));
app.use('/api/updates', require('./routes/updates'));
app.use('/api/content/updates', require('./routes/updates'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/user-auth', require('./routes/userAuth'));
app.use('/api/pdf', require('./routes/pdf'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/bi', require('./routes/bi'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/clearance', require('./routes/clearance'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/preferences', require('./routes/preferences'));
app.use('/api/content', require('./routes/content'));
app.use('/api/intelligence', require('./routes/intelligence'));
app.use('/api/tblmng', require('./routes/tblmng'));
app.use('/api/user', require('./routes/user'));
app.use('/api/generalsetting', require('./routes/generalsettings'));
app.use('/api/invoicesetting', require('./routes/generalsettings'));
app.use('/api/defaultentrysetting', require('./routes/generalsettings'));
app.use('/api/import', require('./routes/import'));

const PORT = process.env.PORT || 3000;
const AUTO_BLOG_TIMEZONE = 'Asia/Kolkata';
const AUTO_BLOG_TEST_DATE = '2026-08-08';
// Run daily at 8:00 AM IST: full web blogs on odd dates and concise app news
// on even dates.
const AUTO_BLOG_CRON = process.env.AUTO_BLOG_CRON || '0 8 * * *';
let autoBlogRunInProgress = false;

// This cron expression includes today's IST date and the task stops after its
// first invocation, preventing these test uploads from repeating tomorrow.
function scheduleOneTimeAutoBlogTest(hour, minute, label, job = () => autoBlogService.runDaily()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: AUTO_BLOG_TIMEZONE,
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  }).formatToParts(new Date());
  const day = parts.find(part => part.type === 'day').value;
  const month = parts.find(part => part.type === 'month').value;
  const year = parts.find(part => part.type === 'year').value;
  const istDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  if (istDate !== AUTO_BLOG_TEST_DATE) return;
  const currentMinutes = Number(parts.find(part => part.type === 'hour').value) * 60
    + Number(parts.find(part => part.type === 'minute').value);
  const scheduledMinutes = hour * 60 + minute;

  // If deployment finishes a little after a one-time test minute, preserve the
  // test by running it once immediately. Never carry it to another day.
  if (currentMinutes > scheduledMinutes) {
    if (currentMinutes <= scheduledMinutes + 2) {
      console.log(`[AutoBlog] ${label} test was deployed late; running it immediately.`);
      void job();
    }
    return;
  }

  const task = cron.schedule(`${minute} ${hour} ${day} ${month} *`, async () => {
    task.stop();
    console.log(`[AutoBlog] Running one-time ${label} test.`);
    await job();
  }, { timezone: AUTO_BLOG_TIMEZONE });

  console.log(`[AutoBlog] One-time ${label} test scheduled for today at ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} IST.`);
}

async function runOneTimeLiveBlogTest() {
  const localDraft = await autoBlogService.runDaily();
  if (!localDraft) {
    console.log('[LiveBlog] No verified local draft was created, so nothing was sent to production.');
    return;
  }

  try {
    const liveBlog = await publishDraftToLive(localDraft);
    console.log(`[LiveBlog] Production draft ${liveBlog.alreadyExists ? 'already exists' : 'created'} with ID: ${liveBlog.id}`);
  } catch (error) {
    console.error('[LiveBlog] Failed to sync draft to production:', error.response?.data?.error || error.message);
  }
}

async function runScheduledAutoBlog(trigger, contentMode = getAutoBlogContentMode()) {
  if (autoBlogRunInProgress) {
    console.warn(`[AutoBlog] ${trigger} run skipped because another run is still in progress.`);
    return null;
  }

  autoBlogRunInProgress = true;
  try {
    console.log(`[AutoBlog] Starting ${trigger} run.`);
    return await autoBlogService.runDaily({ contentMode });
  } catch (error) {
    console.error(`[AutoBlog] ${trigger} run failed:`, error);
    return null;
  } finally {
    autoBlogRunInProgress = false;
  }
}

function getAutoBlogContentMode() {
  const day = new Intl.DateTimeFormat('en-GB', {
    timeZone: AUTO_BLOG_TIMEZONE,
    day: 'numeric'
  }).format(new Date());
  return Number(day) % 2 === 1 ? 'web' : 'app';
}

// Database Sync and Server Start
const shouldAlterSchema = process.env.DB_SYNC_ALTER !== 'false';

const startServer = async () => {
  const connected = await testConnection();
  if (!connected) {
    console.error('[DB] ❌ Aborting server start due to database connection failure.');
    process.exit(1);
  }

  try {
    // Manually add columns to SQLite since alter:true often fails
    try { await sequelize.query('ALTER TABLE Updates ADD COLUMN author VARCHAR(255);'); } catch (e) { }
    try { await sequelize.query('ALTER TABLE Updates ADD COLUMN tags TEXT;'); } catch (e) { }
    try { await sequelize.query('ALTER TABLE Updates ADD COLUMN seoTitle VARCHAR(255);'); } catch (e) { }
    try { await sequelize.query('ALTER TABLE Updates ADD COLUMN seoDescription TEXT;'); } catch (e) { }
    try { await sequelize.query('ALTER TABLE Updates ADD COLUMN seoKeywords TEXT;'); } catch (e) { }
    // Production keeps DB_SYNC_ALTER=false, so every model field introduced
    // after the initial SQLite database needs an explicit idempotent patch.
    try { await sequelize.query('ALTER TABLE Updates ADD COLUMN slug VARCHAR(120);'); } catch (e) { }
    try { await sequelize.query('ALTER TABLE Updates ADD COLUMN imageAltText VARCHAR(255);'); } catch (e) { }
    try { await sequelize.query('ALTER TABLE Updates ADD COLUMN imageTitle VARCHAR(255);'); } catch (e) { }
    try { await sequelize.query("ALTER TABLE AutoBlogRuns ADD COLUMN contentMode VARCHAR(32) DEFAULT 'web';"); } catch (e) { }
    console.log('[DB] Running robust schema patches for SQLite...');
    await sequelize.query("ALTER TABLE Leads ADD COLUMN utm_source VARCHAR(255) DEFAULT 'organic'").catch(() => { });
    await sequelize.query("ALTER TABLE Leads ADD COLUMN score INTEGER DEFAULT 0").catch(() => { });
    await sequelize.query("ALTER TABLE Updates ADD COLUMN isApproved BOOLEAN DEFAULT 0").catch(() => { });
    await sequelize.query("ALTER TABLE Updates ADD COLUMN isExclusive BOOLEAN DEFAULT 0").catch(() => { });
    // Keep the public byline consistent for generated posts. The audit table
    // retains their automated origin without exposing it to readers.
    await sequelize.query("UPDATE Updates SET author = 'Dholera Admin' WHERE author IN ('Auto-Blogger AI', 'Auto-Blogger AI App News')");
    // Older production SQLite databases may predate the user security/audit
    // fields. Add each optional column before Sequelize inspects the model;
    // SQLite safely ignores the ALTER when the column already exists.
    const appUserColumns = [
      ['last_login_at', 'DATETIME'],
      ['last_login_ip', 'VARCHAR(64)'],
      ['last_login_user_agent', 'TEXT'],
      ['last_failed_login_at', 'DATETIME'],
      ['failed_login_attempts', 'INTEGER DEFAULT 0'],
      ['locked_until', 'DATETIME'],
      ['signup_ip', 'VARCHAR(64)'],
      ['signup_user_agent', 'TEXT'],
      ['accepted_terms_at', 'DATETIME'],
      ['accepted_privacy_at', 'DATETIME'],
    ];
    for (const [column, definition] of appUserColumns) {
      await sequelize.query(`ALTER TABLE AppUsers ADD COLUMN ${column} ${definition}`).catch(() => { });
    }
    await sequelize.sync({ alter: shouldAlterSchema });
    console.log(`[DB] Tables synced successfully (Alter: ${shouldAlterSchema}).`);
  } catch (err) {
    console.error('[DB] ❌ Failed to sync tables:', err.message);
    console.log('[DB] Continuing server start despite sync failure to prevent 502 Gateway errors.');
  }

  server.listen(PORT, () => {
    console.log(`[Server] ✅ Running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
    console.log(`[Socket] ⚡ Engine active`);

    // Run background tasks after server is up to avoid blocking health checks
    seedPdfsIfEmpty(PdfDocument).catch(err => console.error('[Seed] PDF seed failed:', err));
    seedBlogIfEmpty().catch(err => console.error('[Seed] Blog seed failed:', err));

    // Initialize Backup Service
    BackupService.init();

    // One-time test uploads for today only. The normal schedule remains below.
    scheduleOneTimeAutoBlogTest(10, 25, '10:25 AM live blog', runOneTimeLiveBlogTest);

    // Run on alternate calendar dates (1, 3, 5, 7, ...), at 8:00 AM IST.
    // runDaily() also enforces the 36-hour minimum gap at month boundaries.
    cron.schedule(AUTO_BLOG_CRON, () => {
      void runScheduledAutoBlog('scheduled');
    }, {
      timezone: AUTO_BLOG_TIMEZONE
    });
    console.log(`[AutoBlog] Daily odd/even schedule active: "${AUTO_BLOG_CRON}" (${AUTO_BLOG_TIMEZONE}).`);
    if (process.env.AUTO_BLOG_RUN_ON_STARTUP !== 'false') {
      void runScheduledAutoBlog('startup recovery');
    }
  });
};

if (require.main === module) {
  startServer();
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);

  if (err && err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ error: 'Your request could not be completed. Please refresh and try again.' });
  }

  // Handle Multer errors
  if (err instanceof require('multer').MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE' || err.code === 'LIMIT_FIELD_VALUE' || err.code === 'LIMIT_PART_COUNT' || err.code === 'LIMIT_FIELD_COUNT') {
      return res.status(413).json({
        error: 'Upload too large. Please reduce the image or post size and try again.'
      });
    }
    return res.status(400).json({ error: 'Upload failed. Please check the file and try again.' });
  }

  res.status(err.status || 500).json({
    error: 'Something went wrong. Please try again later.'
  });
});

process.on('uncaughtException', (err) => {
  console.error('[CRITICAL] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[CRITICAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = app;
