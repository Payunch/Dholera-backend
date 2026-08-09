const express = require('express');
const router = express.Router();
const { Lead, PdfView, PdfDocument } = require('../models');
const { verifyToken } = require('./auth');
const { Op } = require('sequelize');

/**
 * GET /api/intelligence/leaderboard
 * Returns top leads ranked by AI Score.
 */
router.get('/leaderboard', verifyToken, async (req, res) => {
  try {
    const leads = await Lead.findAll({
      where: {
        score: { [Op.gt]: 0 }
      },
      order: [['score', 'DESC']],
      limit: 10,
      attributes: ['id', 'name', 'phone', 'score', 'interest_profile', 'status']
    });

    res.json(leads);
  } catch (err) {
    res.status(500).json({ error: 'Unable to complete this action right now.' });
  }
});

/**
 * GET /api/intelligence/stats
 * Returns high-level AI insights.
 */
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const totalLeads = await Lead.count();
    const hotLeads = await Lead.count({ where: { score: { [Op.gt]: 150 } } });
    const warmLeads = await Lead.count({ where: { score: { [Op.between]: [51, 150] } } });
    
    // Calculate average score
    const avgScore = await Lead.avg('score') || 0;

    res.json({
      totalLeads,
      hotLeads,
      warmLeads,
      avgScore: Math.round(avgScore),
      hotPercentage: totalLeads > 0 ? Math.round((hotLeads / totalLeads) * 100) : 0
    });
  } catch (err) {
    res.status(500).json({ error: 'Unable to complete this action right now.' });
  }
});

module.exports = router;

