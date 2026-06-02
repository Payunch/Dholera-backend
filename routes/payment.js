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
 * Manually unlocks access based on a 12-digit UTR/Ref No.
 */
router.post('/verify-utr', async (req, res) => {
  try {
    let { utr, transactionId, leadToken } = req.body;
    if (!utr || !transactionId || !leadToken) {
      return res.status(400).json({ error: 'UTR and Transaction ID required' });
    }

    // Basic validation: UTR should be 12 digits for most Indian banks
    if (!/^\d{12}$/.test(utr)) {
      return res.status(400).json({ error: 'Please enter a valid 12-digit UTR/Reference number.' });
    }

    leadToken = extractToken(leadToken);
    const lead = await Lead.findOne({ where: { lead_token: leadToken } });
    if (!lead) return res.status(403).json({ error: 'Invalid session' });

    // Find all pending records for this manual transaction attempt
    const purchases = await PdfPurchase.findAll({ 
      where: { transaction_id: transactionId, lead_id: lead.id } 
    });

    if (purchases.length === 0) {
      return res.status(404).json({ error: 'Transaction record not found.' });
    }

    // Mark as completed instantly (Admin will verify later)
    for (const purchase of purchases) {
      await purchase.update({ 
        status: 'completed', 
        gateway_payment_id: utr 
      });

      // If it was a PRO purchase, update lead
      if (purchase.pdf_id === 0) {
        await lead.update({ is_pro: true });
      }
    }

    res.json({ success: true, message: 'Access granted. Thank you for your payment.' });

  } catch (err) {
    console.error('[Payment] UTR Verify Error:', err);
    res.status(500).json({ error: 'Failed to verify UTR' });
  }
});

module.exports = router;
