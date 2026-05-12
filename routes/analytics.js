const express = require('express');
const router = express.Router();
const { Lead, Update, VisitorSession, sequelize } = require('../models');
const { verifyToken } = require('./auth');
const { Op } = require('sequelize');

// GET analytics data summary (Admin)
router.get('/', verifyToken, async (req, res) => {
  try {
    console.log('[Analytics] Fetching summary data...');
    
    // 1. Total Leads
    const totalLeads = await Lead.count().catch(err => {
      console.error('[Analytics] Error counting leads:', err.message);
      return 0;
    });

    // 2. Leads this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const leadsThisMonth = await Lead.count({
      where: {
        createdAt: { [Op.gte]: startOfMonth }
      }
    }).catch(err => {
      console.error('[Analytics] Error counting monthly leads:', err.message);
      return 0;
    });

    // 3. Total Updates
    const totalUpdates = await Update.count().catch(err => {
      console.error('[Analytics] Error counting updates:', err.message);
      return 0;
    });

    // 4. Total Visitors (unique fingerprints from sessions)
    let totalVisitors = 0;
    try {
      const totalVisitorsResult = await VisitorSession.findAll({
        attributes: [
          [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('browserFingerprint'))), 'count']
        ],
        raw: true
      });
      totalVisitors = totalVisitorsResult[0]?.count || 0;
    } catch (err) {
      console.error('[Analytics] Error counting visitors via fingerprint, falling back to simple count:', err.message);
      totalVisitors = await VisitorSession.count().catch(() => 0);
    }

    console.log(`[Analytics] Success: leads=${totalLeads}, monthly=${leadsThisMonth}, updates=${totalUpdates}, visitors=${totalVisitors}`);

    res.json({
      success: true,
      analytics: {
        totalLeads,
        leadsThisMonth,
        totalUpdates,
        totalVisitors
      }
    });
  } catch (err) {
    console.error('[Analytics] Fatal Error:', err);
    res.status(500).json({ error: 'Failed to generate analytics summary' });
  }
});

module.exports = router;
