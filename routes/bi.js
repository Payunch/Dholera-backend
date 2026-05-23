const express = require('express');
const router = express.Router();
const { Lead, PdfView, PdfPurchase, PdfDocument, sequelize } = require('../models');
const { verifyToken } = require('./auth');
const { Op } = require('sequelize');

// GET aggregated business intelligence
router.get('/overview', verifyToken, async (req, res) => {
  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    // 1. Lead Stats
    const totalLeads = await Lead.count();
    const newLeads30d = await Lead.count({ where: { createdAt: { [Op.gte]: thirtyDaysAgo } } });

    // 2. Revenue Stats (from the new Paywall)
    const totalRevenuePaise = await PdfPurchase.sum('amount', { where: { status: 'completed' } }) || 0;
    const totalRevenueINR = totalRevenuePaise / 100;
    const purchases30d = await PdfPurchase.count({ 
      where: { status: 'completed', updatedAt: { [Op.gte]: thirtyDaysAgo } } 
    });

    // 3. Document Engagement
    const totalPdfViews = await PdfView.count();
    
    // 4. Top Performing PDFs (by Revenue)
    const topPdfs = await PdfPurchase.findAll({
      where: { status: 'completed' },
      attributes: [
        'pdf_id',
        [sequelize.fn('COUNT', sequelize.col('pdf_id')), 'purchase_count'],
        [sequelize.fn('SUM', sequelize.col('amount')), 'total_revenue']
      ],
      group: ['pdf_id'],
      include: [{ model: PdfDocument, attributes: ['title'] }],
      order: [[sequelize.literal('total_revenue'), 'DESC']],
      limit: 5
    });

    res.json({
      summary: {
        totalLeads,
        newLeads30d,
        totalRevenueINR,
        purchases30d,
        totalPdfViews
      },
      topPdfs: topPdfs.map(p => ({
        id: p.pdf_id,
        title: p.PdfDocument?.title || 'Unknown',
        sales: p.getDataValue('purchase_count'),
        revenue: p.getDataValue('total_revenue') / 100
      }))
    });
  } catch (err) {
    console.error('Analytics Error:', err);
    res.status(500).json({ error: 'Failed to fetch analytics overview' });
  }
});

module.exports = router;
