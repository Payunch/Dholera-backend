const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { Op } = require('sequelize');
const { PdfPurchase, PdfDocument, Lead, sequelize } = require('../models');
const { logAuditEvent } = require('../services/auditLogger');
const { sendDirectNotification } = require('../services/notificationService');
const { verifyToken } = require('./auth');

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

/**
 * POST /api/payment/request-manual
 * Payload: { pdfIds: [], type: 'view' | 'download' }
 * Creates pending purchase records and returns a temp transaction ID.
 */
router.post('/request-manual', async (req, res) => {
  try {
    const { pdfIds, type } = req.body;
    const leadToken = req.headers['authorization'] || req.headers['x-lead-token'] || '';
    
    let cleanToken = leadToken;
    if (cleanToken.toLowerCase().startsWith('bearer ')) {
      cleanToken = cleanToken.slice(7).trim();
    }

    if (!pdfIds || !Array.isArray(pdfIds) || pdfIds.length === 0) {
      return res.status(400).json({ error: 'No PDFs selected' });
    }

    const lead = await Lead.findOne({ where: { lead_token: cleanToken } });
    if (!lead) return res.status(401).json({ error: 'Unauthorized' });

    // Calculate price: View = 150, Download = 300, capped at 499 for all
    let totalAmount = 0;
    if (pdfIds.includes(0) || pdfIds.includes('0')) {
      totalAmount = 499;
    } else {
      const pricePerPdf = type === 'download' ? 300 : 150;
      totalAmount = pdfIds.length * pricePerPdf;
      if (totalAmount > 499) {
        totalAmount = 499;
      }
    }

    const tempTxnId = `TEMP_${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    const finalPdfIds = (totalAmount === 499) ? [0] : pdfIds;

    const purchases = [];
    for (const pdfId of finalPdfIds) {
      const existing = await PdfPurchase.findOne({
        where: { lead_id: lead.id, pdf_id: pdfId, status: { [Op.in]: ['pending', 'awaiting_approval', 'completed'] } }
      });
      if (existing) {
        if (existing.status === 'completed') continue;
        await existing.destroy();
      }

      purchases.push({
        lead_id: lead.id,
        pdf_id: pdfId,
        amount: totalAmount * 100, // stored in paise
        currency: 'INR',
        transaction_id: tempTxnId,
        status: 'pending',
        type: type || 'view'
      });
    }

    if (purchases.length === 0) {
      return res.json({ success: true, message: 'All selected PDFs are already unlocked.', alreadyUnlocked: true });
    }

    await PdfPurchase.bulkCreate(purchases);

    res.json({
      success: true,
      transaction_id: tempTxnId,
      amount: totalAmount,
      currency: 'INR'
    });
  } catch (err) {
    console.error('Request Manual Payment Error:', err);
    res.status(500).json({ error: 'Failed to request payment' });
  }
});

/**
 * POST /api/payment/verify-utr
 * Payload: { transaction_id: String, utr: String }
 * Submits the UTR for verification.
 */
router.post('/verify-utr', async (req, res) => {
  try {
    const { transaction_id, utr } = req.body;
    if (!transaction_id || !utr) {
      return res.status(400).json({ error: 'Transaction ID and UTR are required' });
    }

    if (!/^\d{10,14}$/.test(utr)) {
      return res.status(400).json({ error: 'Invalid UTR format. Must be 10-14 digits.' });
    }

    const purchases = await PdfPurchase.findAll({ where: { transaction_id } });
    if (purchases.length === 0) {
      return res.status(404).json({ error: 'Payment request not found or expired.' });
    }

    const existingTxn = await PdfPurchase.findOne({ where: { transaction_id: utr } });
    if (existingTxn) {
      return res.status(400).json({ error: 'This UTR / Transaction ID has already been submitted.' });
    }

    await PdfPurchase.update({
      transaction_id: utr,
      status: 'awaiting_approval'
    }, {
      where: { transaction_id }
    });

    const io = req.app.get('io');
    if (io) {
      io.to('admin_alerts').emit('new_pending_approval');
    }

    res.json({ success: true, message: 'UTR submitted for verification. Access will be granted shortly.' });
  } catch (err) {
    console.error('Verify UTR Error:', err);
    res.status(500).json({ error: 'Failed to submit UTR' });
  }
});

/**
 * GET /api/payment/admin/pending
 * Returns pending and completed manual payments for admin display.
 */
router.get('/admin/pending', verifyToken, async (req, res) => {
  try {
    const pendingPurchases = await PdfPurchase.findAll({
      include: [
        { model: Lead, attributes: ['id', 'name', 'phone'] },
        { model: PdfDocument, attributes: ['id', 'title'] }
      ],
      order: [['updatedAt', 'DESC']]
    });

    const grouped = {};
    pendingPurchases.forEach(p => {
      const txnId = p.transaction_id || 'unknown';
      if (!grouped[txnId]) {
        grouped[txnId] = {
          id: p.id,
          transaction_id: txnId,
          utr: txnId,
          amount: p.amount,
          status: p.status === 'pending' ? 'awaiting_approval' : p.status,
          updatedAt: p.updatedAt,
          lead: p.Lead ? { id: p.Lead.id, name: p.Lead.name, phone: p.Lead.phone } : { id: p.lead_id, name: 'Guest', phone: '' },
          items: []
        };
      }
      grouped[txnId].items.push(p.pdf_id === 0 ? 'ALL MAPS / PRO ACCESS' : (p.PdfDocument ? p.PdfDocument.title : `PDF ID ${p.pdf_id}`));
    });

    res.json(Object.values(grouped));
  } catch (err) {
    console.error('Fetch pending approvals error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/payment/admin/count-pending
 * Returns pending count.
 */
router.get('/admin/count-pending', verifyToken, async (req, res) => {
  try {
    const count = await PdfPurchase.count({
      where: { status: 'awaiting_approval' },
      distinct: true,
      col: 'transaction_id'
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/payment/admin/approve/:txnId
 * Approves a transaction.
 */
router.post('/admin/approve/:txnId', verifyToken, async (req, res) => {
  try {
    const { txnId } = req.params;
    const purchases = await PdfPurchase.findAll({ where: { transaction_id: txnId } });
    if (purchases.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    await PdfPurchase.update({ status: 'completed' }, { where: { transaction_id: txnId } });

    const hasPro = purchases.some(p => p.pdf_id === 0);
    if (hasPro) {
      const leadId = purchases[0].lead_id;
      await Lead.update({ is_pro: true }, { where: { id: leadId } });
    }

    const firstPurchase = purchases[0];
    const lead = await Lead.findByPk(firstPurchase.lead_id);
    const io = req.app.get('io');
    if (io && lead) {
      io.to(`lead_${lead.lead_token}`).emit('payment_approved');
    }

    res.json({ success: true, message: 'Payment approved and access granted.' });
  } catch (err) {
    console.error('Approve payment error:', err);
    res.status(500).json({ error: 'Failed to approve payment' });
  }
});

module.exports = router;
