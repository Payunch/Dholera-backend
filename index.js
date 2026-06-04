const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const csurf = require('csurf');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { sequelize, PdfDocument } = require('./models');
const { testConnection, getDatabaseInfo } = require('./config/database');
const { buildOriginMatcher } = require('./utils/originMatcher');
const { seedPdfsIfEmpty } = require('./scripts/seed_cloudinary_pdfs');
const { seedBlogIfEmpty } = require('./scripts/seed_blog_startup');

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
app.use(express.json({ limit: '5mb' })); // Increased limit for larger articles
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
    const sessionDir = dbInfo.storagePath ? path.dirname(dbInfo.storagePath) : __dirname;
    
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

const SESSION_SECRET = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'dev-session-secret';
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
    secure: true, // Always secure for modern browser cross-site compatibility
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
  const isAdminSessionMutation = Boolean(req.session?.isAdmin || req.cookies?.admin_access_token || req.cookies?.admin_refresh_token);
  const isPublicLeadMutation = [
    '/api/leads',
    '/api/leads/onboard',
    '/api/leads/save-direct',
    '/api/leads/track-returning'
  ].includes(req.path);

  if (isAuthMutation || (isAdminSessionMutation && !isPublicLeadMutation)) {
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

app.get('/healthz/runtime', (req, res) => {
  const configuredPort = Number.parseInt(process.env.PORT || '3000', 10);
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
    uptimeSec: Math.round(process.uptime())
  });
});

// Routes
app.use('/api/leads', require('./routes/leads'));
app.use('/api/updates', require('./routes/updates'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/pdf', require('./routes/pdf'));
app.use('/api/payment', require('./routes/payment'));
app.use('/api/bi', require('./routes/bi'));
app.use('/api/whatsapp', require('./routes/whatsapp'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/clearance', require('./routes/clearance'));
app.use('/api/admin', require('./routes/admin'));

const PORT = process.env.PORT || 3000;

// Database Sync and Server Start
const shouldAlterSchema = process.env.DB_SYNC_ALTER === 'true';

const startServer = async () => {
  const connected = await testConnection();
  if (!connected) {
    console.error('[DB] ❌ Aborting server start due to database connection failure.');
    process.exit(1);
  }

  try {
    await sequelize.sync({ alter: shouldAlterSchema });
    console.log('[DB] Tables synced successfully.');
  } catch (err) {
    console.error('[DB] ❌ Failed to sync tables:', err.message);
    console.error('[DB] Try setting DB_SYNC_ALTER=true in .env to auto-migrate columns.');
    process.exit(1);
  }

  server.listen(PORT, () => {
    console.log(`[Server] ✅ Running on port ${PORT} (${process.env.NODE_ENV || 'development'})`);
    console.log(`[Socket] ⚡ Engine active`);
    
    // Run background tasks after server is up to avoid blocking health checks
    seedPdfsIfEmpty(PdfDocument).catch(err => console.error('[Seed] PDF seed failed:', err));
    seedBlogIfEmpty().catch(err => console.error('[Seed] Blog seed failed:', err));
  });
};

if (require.main === module) {
  startServer();
}

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  
  if (err && err.code === 'EBADCSRFTOKEN') {
    return res.status(403).json({ error: 'Invalid CSRF token. Please refresh the page.' });
  }

  // Handle Multer errors
  if (err instanceof require('multer').MulterError) {
    return res.status(400).json({ error: `Upload error: ${err.message}` });
  }

  res.status(err.status || 500).json({ 
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack })
  });
});

module.exports = app;
