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

// GET detailed analytics data (Admin)
router.get('/detailed', verifyToken, async (req, res) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ error: 'Start and end dates are required.' });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Invalid start or end date format.' });
    }

    endDate.setHours(23, 59, 59, 999);

    // Fetch records in range
    const [leads, updates, visitors] = await Promise.all([
      Lead.findAll({
        where: { createdAt: { [Op.between]: [startDate, endDate] } },
        attributes: ['createdAt']
      }),
      Update.findAll({
        where: { createdAt: { [Op.between]: [startDate, endDate] } },
        attributes: ['createdAt']
      }),
      VisitorSession.findAll({
        where: { createdAt: { [Op.between]: [startDate, endDate] } },
        attributes: ['createdAt', 'browserFingerprint']
      })
    ]);

    // Grouping helper
    const groupByDate = (items) => {
      return items.reduce((acc, item) => {
        const dateStr = new Date(item.createdAt).toISOString().split('T')[0];
        acc[dateStr] = (acc[dateStr] || 0) + 1;
        return acc;
      }, {});
    };

    // Unique visitors per day
    const visitorsByDate = visitors.reduce((acc, item) => {
      const dateStr = new Date(item.createdAt).toISOString().split('T')[0];
      if (!acc[dateStr]) acc[dateStr] = new Set();
      acc[dateStr].add(item.browserFingerprint);
      return acc;
    }, {});

    const groupedLeads = groupByDate(leads);
    const groupedUpdates = groupByDate(updates);

    // Build daily metrics array filling in missing dates
    const dailyMetrics = [];
    const currentDate = new Date(startDate);
    let totalLeads = 0;
    let totalUpdates = 0;
    let totalVisitors = 0;

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayLeads = groupedLeads[dateStr] || 0;
      const dayUpdates = groupedUpdates[dateStr] || 0;
      const dayVisitors = visitorsByDate[dateStr]?.size || 0;

      totalLeads += dayLeads;
      totalUpdates += dayUpdates;
      totalVisitors += dayVisitors;

      dailyMetrics.push({
        date: dateStr,
        leads: dayLeads,
        updates: dayUpdates,
        visitors: dayVisitors
      });

      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Top days by activity (weighted score: leads*3 + visitors)
    const topDays = [...dailyMetrics]
      .sort((a, b) => (b.leads * 3 + b.visitors) - (a.leads * 3 + a.visitors))
      .slice(0, 5);

    // Calculate trend vs previous period
    const startMs = startDate.getTime();
    const endMs = endDate.getTime();
    const periodLengthMs = endMs - startMs + 1; // +1 to include the full range

    const prevPeriodStart = new Date(startMs - periodLengthMs);
    const prevPeriodEnd = new Date(startMs - 1);

    const prevLeadsCount = await Lead.count({
      where: { createdAt: { [Op.between]: [prevPeriodStart, prevPeriodEnd] } }
    });

    let leadTrend = 0;
    if (prevLeadsCount > 0) {
      leadTrend = parseFloat((((totalLeads - prevLeadsCount) / prevLeadsCount) * 100).toFixed(1));
    } else if (totalLeads > 0) {
      leadTrend = 100.0; // 100% growth if starting from 0
    }

    res.json({
      success: true,
      analytics: {
        totalLeads,
        totalUpdates,
        totalVisitors,
        leadTrend,
        dailyMetrics,
        topDays
      }
    });
  } catch (err) {
    console.error('[Analytics Detailed] Fatal Error:', err);
    res.status(500).json({ error: 'Failed to generate detailed analytics' });
  }
});

module.exports = router;
