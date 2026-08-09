const express = require('express');
const router = express.Router();
const { Lead, Update, PdfDocument, sequelize } = require('../models');
const { verifyToken } = require('./auth');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');

// POST dummy track route to stop 404s
router.post('/track', (req, res) => {
  res.status(204).end();
});

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

    // 4. Total Visitors (Session tracking removed)
    let totalVisitors = 0;

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

// GET platform-level business insights (Admin)
router.get('/platform-insights', verifyToken, async (req, res) => {
  try {
    const { PdfPurchase, PdfDocument, PdfView, Lead } = require('../models');

    // 1. Total Revenue (Completed)
    const revenueResult = await PdfPurchase.sum('amount', { where: { status: 'completed' } });
    const totalRevenue = (revenueResult || 0) / 100;

    // 2. Conversion: Total Leads vs Purchases
    const totalLeads = await Lead.count();
    const uniqueBuyers = await PdfPurchase.count({
      distinct: true,
      col: 'lead_id',
      where: { status: 'completed' }
    });
    const conversionRate = totalLeads > 0 ? (uniqueBuyers / totalLeads) * 100 : 0;

    // 3. Top Documents (by Views)
    const topViews = await PdfView.findAll({
      attributes: [
        'pdf_id',
        [sequelize.fn('COUNT', sequelize.col('PdfView.id')), 'viewCount']
      ],
      group: ['pdf_id'],
      include: [{ model: PdfDocument, attributes: ['title'] }],
      order: [[sequelize.literal('viewCount'), 'DESC']],
      limit: 5
    });

    // 4. Top Documents (by Purchase)
    const topPurchases = await PdfPurchase.findAll({
      where: { status: 'completed', pdf_id: { [Op.ne]: 0 } },
      attributes: [
        'pdf_id',
        [sequelize.fn('COUNT', sequelize.col('PdfPurchase.id')), 'buyCount']
      ],
      group: ['pdf_id'],
      include: [{ model: PdfDocument, attributes: ['title'] }],
      order: [[sequelize.literal('buyCount'), 'DESC']],
      limit: 5
    });

    // 5. Pro Members
    const proCount = await Lead.count({ where: { is_pro: true } });

    res.json({
      success: true,
      data: {
        totalRevenue,
        conversionRate: conversionRate.toFixed(1),
        uniqueBuyers,
        proCount,
        topViews: topViews.map(v => ({ title: v.PdfDocument?.title || 'Unknown', count: v.get('viewCount') })),
        topPurchases: topPurchases.map(p => ({ title: p.PdfDocument?.title || 'Unknown', count: p.get('buyCount') }))
      }
    });

  } catch (err) {
    console.error('[Platform Insights Error]:', err);
    res.status(500).json({ error: 'Unable to complete this action right now.' });
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
    const [leads, updates] = await Promise.all([
      Lead.findAll({
        where: { createdAt: { [Op.between]: [startDate, endDate] } },
        attributes: ['createdAt']
      }),
      Update.findAll({
        where: { createdAt: { [Op.between]: [startDate, endDate] } },
        attributes: ['createdAt']
      })
    ]);
    const visitors = []; // Session tracking removed

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

// GET campaign analytics based on UTM source (Admin)
router.get('/campaigns', verifyToken, async (req, res) => {
  try {
    const leads = await Lead.findAll({
      attributes: [
        'utm_source',
        [sequelize.fn('COUNT', sequelize.col('id')), 'totalVisitors'],
        [sequelize.fn('SUM', sequelize.literal("CASE WHEN verified = 1 THEN 1 ELSE 0 END")), 'verifiedLeads']
      ],
      group: ['utm_source'],
      order: [[sequelize.literal('totalVisitors'), 'DESC']]
    });

    const campaigns = leads.map(lead => {
      const total = parseInt(lead.get('totalVisitors') || 0, 10);
      const verified = parseInt(lead.get('verifiedLeads') || 0, 10);
      const conversionRate = total > 0 ? ((verified / total) * 100).toFixed(1) : 0;
      
      return {
        campaign: lead.utm_source || 'organic',
        visitors: total,
        verifiedLeads: verified,
        conversionRate: parseFloat(conversionRate)
      };
    });

    res.json({ success: true, campaigns });
  } catch (err) {
    console.error('[Analytics Campaigns] Error:', err);
    res.status(500).json({ error: 'Failed to generate campaign analytics' });
  }
});


// GET separate export for Blogs/Updates
router.get('/export/updates', verifyToken, async (req, res) => {
  try {
    const updates = await Update.findAll({ order: [['createdAt', 'DESC']] });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Blogs');
    
    sheet.columns = [
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Content', key: 'content', width: 50 },
      { header: 'Created At', key: 'createdAt', width: 25 }
    ];

    updates.forEach(u => sheet.addRow({
      title: u.title,
      category: u.category,
      content: u.content,
      createdAt: u.createdAt.toLocaleString()
    }));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=blogs_export.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: 'Unable to complete this action right now.' });
  }
});

// GET separate export for PDFs
router.get('/export/pdfs', verifyToken, async (req, res) => {
  try {
    const pdfs = await PdfDocument.findAll({ order: [['createdAt', 'DESC']] });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Documents');
    
    sheet.columns = [
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Protected', key: 'is_protected', width: 12 },
      { header: 'URL', key: 'url', width: 40 }
    ];

    pdfs.forEach(p => sheet.addRow({
      title: p.title,
      category: p.category,
      is_protected: p.is_protected ? 'Yes' : 'No',
      url: p.url
    }));

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=pdfs_export.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: 'Unable to complete this action right now.' });
  }
});

module.exports = router;

