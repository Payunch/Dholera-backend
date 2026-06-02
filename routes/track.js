const express = require('express');
const router = express.Router();
const { VisitorSession } = require('../models');

// POST /api/track
router.post('/', async (req, res) => {
  try {
    const { sessionId, page, timeSpent, source, deviceType, browserFingerprint } = req.body || {};
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    
    console.log(`[Track] Request from IP: ${ip}, Session: ${sessionId}, Page: ${page}`);
    
    if (!sessionId) {
      console.warn('[Track] Missing sessionId in request body');
      return res.status(400).json({ error: 'sessionId required' });
    }

    let [session, created] = await VisitorSession.findOrCreate({
      where: { sessionId },
      defaults: {
        timeSpent: 0,
        visitedPages: JSON.stringify([]),
        source,
        deviceType,
        browserFingerprint,
        ip
      }
    });

    console.log(`[Track] Session ${sessionId} ${created ? 'created' : 'found'}`);

    // If session was already there, but fingerprint was missing, update it
    if (!created && browserFingerprint && !session.browserFingerprint) {
      session.browserFingerprint = browserFingerprint;
    }

    let pages = [];
    try {
      pages = JSON.parse(session.visitedPages || '[]');
      if (!Array.isArray(pages)) pages = [];
    } catch (e) {
      console.warn('[Track] Invalid JSON in visitedPages, resetting to empty array');
      pages = [];
    }

    if (page && !pages.includes(page)) {
      pages.push(page);
    }

    session.timeSpent = (session.timeSpent || 0) + (timeSpent || 5);
    session.visitedPages = JSON.stringify(pages);
    await session.save();

    res.json(session);
  } catch (err) {
    console.error('[Track] Error:', err.message);
    if (err.stack) console.error(err.stack);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
