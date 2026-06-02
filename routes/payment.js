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

    const baseTransactionId = `${isPro ? 'PRO' : 'PDF'}_${uniqid().toUpperCase()}`;

    // Create pending records for each PDF
    for (let i = 0; i < targetPdfIds.length; i++) {
      const tid = targetPdfIds[i];
      // Make transaction_id unique by adding a suffix for multi-items
      const uniqueTxnId = targetPdfIds.length > 1 ? `${baseTransactionId}_${i+1}` : baseTransactionId;
      
      await PdfPurchase.create({
        lead_id: lead.id,
        pdf_id: tid,
        amount: Math.round(amountPaise / targetPdfIds.length),
        transaction_id: uniqueTxnId,
        status: 'pending'
      });
    }

    const upiId = (process.env.ADMIN_UPI_ID || '917435808310@ybl').trim();
    const merchantName = (process.env.ADMIN_NAME || 'Dholera Platform').trim();

    console.log(`[Payment] Manual Request Created. ID: ${baseTransactionId}, UPI: ${upiId}, Name: ${merchantName}`);

    res.json({
      success: true,
      transactionId: baseTransactionId,
      upiId: upiId,
      merchantName: merchantName,
      amount: amountPaise / 100,
      isPro
    });

  } catch (err) {
    console.error('[Payment] Manual Request Error:', err.message);
    if (err.name === 'SequelizeUniqueConstraintError') {
      console.error('[Payment] Unique Constraint Error Details:', err.errors.map(e => e.message));
    }
    res.status(500).json({ error: 'Failed to initiate payment request', details: err.message });
  }
});

/**
 * POST /api/payment/verify-utr
 * User submits their UTR for verification. 
 * Sets status to 'awaiting_approval'.
 */
router.post('/verify-utr', async (req, res) => {
  try {
    let { utr, transactionId, leadToken } = req.body;
    if (!utr || !transactionId || !leadToken) {
      return res.status(400).json({ error: 'UTR and Transaction ID required' });
    }

    if (!/^\d{10,14}$/.test(utr)) {
      return res.status(400).json({ error: 'Please enter a valid Transaction/UTR number (10-14 digits).' });
    }

    leadToken = extractToken(leadToken);
    const lead = await Lead.findOne({ where: { lead_token: leadToken } });
    if (!lead) return res.status(403).json({ error: 'Invalid session' });

    const purchases = await PdfPurchase.findAll({ 
      where: { transaction_id: transactionId, lead_id: lead.id } 
    });

    if (purchases.length === 0) {
      return res.status(404).json({ error: 'Transaction record not found.' });
    }

    // Set to awaiting_approval
    for (const purchase of purchases) {
      await purchase.update({ 
        status: 'awaiting_approval', 
        gateway_payment_id: utr 
      });
    }

    res.json({ 
      success: true, 
      message: 'Payment submitted for approval. Admin will verify and unlock your access shortly.' 
    });

  } catch (err) {
    console.error('[Payment] UTR Submit Error:', err);
    res.status(500).json({ error: 'Failed to submit payment details' });
  }
});

/**
 * ADMIN ONLY ROUTES
 */
const { verifyToken: adminVerify } = require('./auth');

// GET /api/payment/admin/pending
router.get('/admin/pending', adminVerify, async (req, res) => {
  try {
    const pending = await PdfPurchase.findAll({
      where: { status: 'awaiting_approval' },
      include: [
        { model: Lead, attributes: ['name', 'phone', 'email'] },
        { model: PdfDocument, attributes: ['title'] }
      ],
      order: [['updatedAt', 'DESC']]
    });
    res.json(pending);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/payment/admin/count-pending
router.get('/admin/count-pending', adminVerify, async (req, res) => {
  try {
    const count = await PdfPurchase.count({ where: { status: 'awaiting_approval' } });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/payment/admin/approve/:transactionId
router.post('/admin/approve/:transactionId', adminVerify, async (req, res) => {
  try {
    const { transactionId } = req.params;
    const purchases = await PdfPurchase.findAll({ where: { transaction_id: transactionId } });
    
    if (purchases.length === 0) return res.status(404).json({ error: 'Not found' });

    for (const p of purchases) {
      await p.update({ status: 'completed' });
      
      // If it was a PRO purchase, update lead
      if (p.pdf_id === 0) {
        const lead = await Lead.findByPk(p.lead_id);
        if (lead) await lead.update({ is_pro: true });
      }
    }

    res.json({ success: true, message: 'Payment approved. Access granted.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
