const express = require('express');
const router = express.Router();
const uniqid = require('uniqid');
const { PdfPurchase, PdfDocument, Lead } = require('../models');

// REVENUE SAFETY LIMIT: 18 Lakh INR in Paise
const REVENUE_LIMIT_PAISE = 1800000 * 100;

const extractToken = (token) => {
  if (!token) return '';
  return token.toLowerCase().startsWith('bearer ') ? token.slice(7).trim() : token.trim();
};

/**
 * Helper to calculate current total revenue from completed PDF purchases.
 * This counts manual payments that the Admin has marked as 'completed'.
 */
async function getTotalRevenue() {
  try {
    const result = await PdfPurchase.sum('amount', { where: { status: 'completed' } });
    return result || 0;
  } catch (err) {
    console.error('[Payment] Revenue Calc Error:', err);
    return 0;
  }
}

/**
 * POST /api/payment/request-manual
 * Logs a user's intent to pay via UPI QR and returns UPI details.
 * Also checks the 18 Lakh revenue limit.
 */
router.post('/request-manual', async (req, res) => {
  try {
    let { pdfId, pdfIds, leadToken } = req.body;
    if (!pdfId && (!pdfIds || !Array.isArray(pdfIds)) && !leadToken) {
      return res.status(400).json({ error: 'Selection and Lead Token are required' });
    }

    // 1. REVENUE THRESHOLD CHECK (Safety First)
    const currentRevenue = await getTotalRevenue();
    if (currentRevenue >= REVENUE_LIMIT_PAISE) {
      console.warn(`[Payment] REVENUE LIMIT HIT (Current: ${currentRevenue / 100}). Blocking new requests.`);
      return res.status(403).json({ 
        error: 'System Paused',
        details: 'The platform has reached its threshold for the current cycle. Please contact the Admin directly for access.',
        limitHit: true
      });
    }

    leadToken = extractToken(leadToken);
    const lead = await Lead.findOne({ where: { lead_token: leadToken } });
    if (!lead) return res.status(403).json({ error: 'Invalid lead token' });

    let amountPaise = 0;
    let targetPdfIds = [];
    let isPro = false;

    // All Access (Pro)
    if (pdfId === 'all') {
      if (lead.is_pro) return res.json({ alreadyPurchased: true });
      amountPaise = 49900;
      targetPdfIds = [0];
      isPro = true;
    } 
    // Multi-select (Cart)
    else if (pdfIds && Array.isArray(pdfIds) && pdfIds.length > 0) {
      amountPaise = pdfIds.length * 1000;
      targetPdfIds = pdfIds;
    }
    // Single Select
    else {
      const pdf = await PdfDocument.findByPk(pdfId);
      if (!pdf) return res.status(404).json({ error: 'PDF not found' });
      const existing = await PdfPurchase.findOne({ where: { lead_id: lead.id, pdf_id: pdfId, status: 'completed' } });
      if (existing || lead.is_pro) return res.json({ alreadyPurchased: true });
      amountPaise = 1000;
      targetPdfIds = [pdfId];
    }

    const transactionId = `${isPro ? 'PRO' : 'PDF'}_${uniqid().toUpperCase()}`;

    // Create pending records for each PDF
    for (const tid of targetPdfIds) {
      await PdfPurchase.create({
        lead_id: lead.id,
        pdf_id: tid,
        amount: amountPaise / targetPdfIds.length,
        transaction_id: transactionId,
        status: 'pending'
      });
    }

    res.json({
      success: true,
      transactionId: transactionId,
      upiId: process.env.ADMIN_UPI_ID || '917435808310@ybl',
      merchantName: process.env.ADMIN_NAME || 'Dholera Platform',
      amount: amountPaise / 100,
      isPro
    });

  } catch (err) {
    console.error('[Payment] Manual Request Error:', err.message);
    res.status(500).json({ error: 'Failed to initiate payment request' });
  }
});

module.exports = router;
