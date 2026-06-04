const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { PdfPurchase, PdfDocument, Lead, sequelize } = require('../models');
const { logAuditEvent } = require('../services/auditLogger');
const { sendDirectNotification } = require('../services/notificationService');

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret'
});

/**
 * POST /api/payment/create-order
 * Payload: { pdfIds: [], type: 'view' | 'download' }
 */
router.post('/create-order', async (req, res) => {
  try {
    const { pdfIds, type } = req.body;
    const leadToken = req.headers['authorization'];

    if (!pdfIds || !Array.isArray(pdfIds) || pdfIds.length === 0) {
      return res.status(400).json({ error: 'No PDFs selected' });
    }

    const lead = await Lead.findOne({ where: { lead_token: leadToken } });
    if (!lead) return res.status(401).json({ error: 'Unauthorized' });

    // Pricing logic
    const pricePerPdf = type === 'download' ? 10 : 5;
    const totalAmount = pdfIds.length * pricePerPdf;

    const options = {
      amount: totalAmount * 100, // Amount in paise
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
      notes: {
        leadId: lead.id,
        pdfIds: pdfIds.join(','),
        type: type
      }
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (err) {
    console.error('Razorpay Order Error:', err);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

/**
 * POST /api/payment/verify
 * Verification after frontend payment success
 */
router.post('/verify', async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      pdfIds,
      type
    } = req.body;

    const leadToken = req.headers['authorization'];
    const lead = await Lead.findOne({ where: { lead_token: leadToken } });

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret')
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Payment Verified -> Grant Access
    const purchases = pdfIds.map(pdfId => ({
      lead_id: lead.id,
      pdf_id: pdfId,
      transaction_id: razorpay_payment_id,
      amount: (type === 'download' ? 10 : 5) * 100, // stored in paise
      status: 'completed',
      type: type || 'view'
    }));

    await PdfPurchase.bulkCreate(purchases);

    // Send push notification to the user
    if (lead.fcm_token) {
      sendDirectNotification(
        lead.fcm_token,
        'Map Unlocked! 🔓',
        `Your access to ${pdfIds.length} official document(s) is now active in your Vault.`,
        { type: 'payment_success', pdfCount: pdfIds.length.toString() }
      );
    }

    await logAuditEvent({
      eventType: 'payment.success',
      actorType: 'lead',
      actorId: lead.phone,
      success: true,
      details: { order_id: razorpay_order_id, payment_id: razorpay_payment_id, pdfCount: pdfIds.length }
    });

    res.json({ success: true, message: 'Payment verified and access granted' });
  } catch (err) {
    console.error('Payment Verification Error:', err);
    res.status(500).json({ error: 'Verification failed' });
  }
});

/**
 * Webhook for Razorpay (Safety fallback)
 */
router.post('/webhook', async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  const signature = req.headers['x-razorpay-signature'];

  if (!secret || !signature) return res.status(400).send('Missing secret or signature');

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (expectedSignature !== signature) return res.status(400).send('Invalid signature');

  const event = req.body.event;
  if (event === 'payment.captured') {
    const payment = req.body.payload.payment.entity;
    const { leadId, pdfIds, type } = payment.notes;
    
    // Grant access if not already granted by the verify route
    const ids = pdfIds.split(',');
    for (const pdfId of ids) {
      await PdfPurchase.findOrCreate({
        where: { transaction_id: payment.id, pdf_id: pdfId },
        defaults: {
          lead_id: leadId,
          pdf_id: pdfId,
          transaction_id: payment.id,
          amount: payment.amount, // already in paise from gateway
          status: 'completed',
          type: type || 'view'
        }
      });
    }
  }

  res.json({ status: 'ok' });
});

module.exports = router;
