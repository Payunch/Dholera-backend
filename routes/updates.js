const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { verifyToken } = require('./auth');
const upload = require('../middleware/upload');
const updatesController = require('../controllers/updatesController');
const { reviewBlogForSeo } = require('../services/seoReviewService');

const limitConfig = (prefix, fallbackWindowMs, fallbackMax) => ({
  windowMs: Number.parseInt(process.env[`${prefix}_WINDOW_MS`] || `${fallbackWindowMs}`, 10),
  max: Number.parseInt(process.env[`${prefix}_MAX`] || `${fallbackMax}`, 10),
});

const adminMutationLimiter = rateLimit({
  ...limitConfig('UPDATE_ADMIN_LIMIT', 15 * 60 * 1000, 60),
  keyGenerator: (req) => `${req.ip}:${req.user?.username || 'admin'}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many update actions. Please try again later.' },
});

// RECOVERY ENDPOINT — Admin only
router.post('/recover-post', verifyToken, updatesController.recoverPost);

// MIGRATE DB ENDPOINT — Admin only (was publicly accessible — CRITICAL FIX)
router.get('/migrate-db-now', verifyToken, updatesController.migrateDbNow);

// TEMPORARY FIX ROUTE FOR LIVE SERVER
router.get('/fix-live', verifyToken, updatesController.fixLiveServer);

// Public feed: only published and approved updates.
router.get('/', updatesController.getUpdates);

// Admin feed: includes drafts and unapproved posts. Keep this before /:id.
router.get('/admin/all', verifyToken, updatesController.getUpdates);

// One server-side Gemini call for the editor. The key never reaches the browser.
router.post('/seo-review', verifyToken, adminMutationLimiter, async (req, res) => {
  try {
    if (!req.body?.title || !req.body?.content) {
      return res.status(400).json({ error: 'Add an article title and content before requesting an AI review.' });
    }
    const review = await reviewBlogForSeo(req.body);
    return res.json(review);
  } catch (error) {
    console.error('[updates.seo-review]', error.message);
    return res.status(process.env.GEMINI_API_KEY ? 502 : 503).json({ error: 'AI review is unavailable. Please try again shortly.' });
  }
});

// GET single update by ID (public — intentional)
router.get('/:id', updatesController.getUpdateById);

// POST create update (Admin)
router.post('/', verifyToken, adminMutationLimiter, upload.single('image'), updatesController.createUpdate);

// PUT update (Admin)
router.put('/:id', verifyToken, adminMutationLimiter, upload.single('image'), updatesController.updateUpdate);

// DELETE update (Admin)
router.delete('/:id', verifyToken, adminMutationLimiter, updatesController.deleteUpdate);

// POST one-time seed — Admin only
router.post('/seed/discover-dholera', verifyToken, adminMutationLimiter, updatesController.seedDiscoverDholera);

module.exports = router;
