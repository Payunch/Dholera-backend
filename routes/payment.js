const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { PdfPurchase, PdfDocument, Lead } = require('../models');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder'
});

const PDF_PRICE_PAISE = 1000; // 10 INR

// Create Order for a PDF
router.post('/create-order', async (req, res) => {
  try {
    const { pdfId, leadToken } = req.body;

    if (!pdfId || !leadToken) {
      return res.status(400).json({ error: 'PDF ID and Lead Token are required' });
    }

    const lead = await Lead.findOne({ where: { lead_token: leadToken } });
    if (!lead) {
      return res.status(403).json({ error: 'Invalid lead token' });
    }

    const pdf = await PdfDocument.findByPk(pdfId);
    if (!pdf) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    // Check if already purchased
    const existing = await PdfPurchase.findOne({
      where: { lead_id: lead.id, pdf_id: pdfId, status: 'completed' }
    });
    if (existing) {
      return res.json({ alreadyPurchased: true });
    }

    const options = {
      amount: PDF_PRICE_PAISE,
      currency: 'INR',
      receipt: `pdf_${pdfId}_lead_${lead.id}`,
    };

    const order = await razorpay.orders.create(options);

    // Create a pending purchase record
    await PdfPurchase.create({
      lead_id: lead.id,
      pdf_id: pdfId,
      amount: PDF_PRICE_PAISE,
      razorpay_order_id: order.id,
      status: 'pending'
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error('Razorpay Order Error:', err);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// Verify Payment
router.post('/verify-payment', async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      pdfId,
      leadToken
    } = req.body;

    const secret = process.env.RAZORPAY_KEY_SECRET || 'secret_placeholder';
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(razorpay_order_id + "|" + razorpay_payment_id);
    const generated_signature = hmac.digest('hex');

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    const lead = await Lead.findOne({ where: { lead_token: leadToken } });
    const purchase = await PdfPurchase.findOne({
      where: { razorpay_order_id: razorpay_order_id }
    });

    if (purchase) {
      await purchase.update({
        razorpay_payment_id,
        razorpay_signature,
        status: 'completed'
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Payment Verification Error:', err);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

// Check payment status
router.get('/status/:pdfId', async (req, res) => {
  try {
    const leadToken = req.headers.authorization || req.query.token;
    if (!leadToken) return res.json({ purchased: false });

    const lead = await Lead.findOne({ where: { lead_token: leadToken.replace('Bearer ', '') } });
    if (!lead) return res.json({ purchased: false });

    const purchase = await PdfPurchase.findOne({
      where: { lead_id: lead.id, pdf_id: req.params.pdfId, status: 'completed' }
    });

    res.json({ purchased: !!purchase });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
