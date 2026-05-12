const express = require('express');
const router = express.Router();
const { Lead, Update, VisitorSession, sequelize } = require('../models');
const { verifyToken } = require('./auth');
const { Op } = require('sequelize');

// GET analytics data summary (Admin)
router.get('/', verifyToken, async (req, res) => {
  try {
    // 1. Total Leads
    const totalLeads = await Lead.count();

    // 2. Leads this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const leadsThisMonth = await Lead.count({
      where: {
        createdAt: { [Op.gte]: startOfMonth }
      }
    });

    // 3. Total Updates
    const totalUpdates = await Update.count();

    // 4. Total Visitors (unique fingerprints from sessions)
    const totalVisitorsResult = await VisitorSession.findAll({
      attributes: [
        [sequelize.fn('COUNT', sequelize.fn('DISTINCT', sequelize.col('browserFingerprint'))), 'count']
      ],
      raw: true
    });
    const totalVisitors = totalVisitorsResult[0]?.count || 0;

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
    console.error('Analytics Error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
