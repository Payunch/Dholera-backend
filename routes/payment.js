const express = require('express');
const router = express.Router();
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { PdfPurchase, PdfDocument, Lead } = require('../models');

const normalizeSecret = (value) => String(value || '').trim();

// Initialize Razorpay with explicit configuration checks so production misconfigurations
// fail with a clear message instead of a generic authentication error.
const RAZORPAY_KEY_ID = normalizeSecret(process.env.RAZORPAY_KEY_ID);
const RAZORPAY_KEY_SECRET = normalizeSecret(process.env.RAZORPAY_KEY_SECRET);
const RAZORPAY_CONFIG_READY = Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);

const createRazorpayClient = () => new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET
});

const PDF_PRICE_PAISE = 1000; // 10 INR
const CURRENCY = 'INR';

/**
 * POST /api/payment/create-order
 * Creates a new Razorpay order for a specific PDF and Lead.
 */
router.post('/create-order', async (req, res) => {
  try {
    if (!RAZORPAY_CONFIG_READY) {
      return res.status(503).json({
        error: 'Razorpay is not configured on the server.',
        details: 'Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in the backend environment.'
      });
    }

    let { pdfId, leadToken } = req.body;

    if (!pdfId || !leadToken) {
      return res.status(400).json({ error: 'PDF ID and Lead Token are required' });
    }

    // Clean token (strip Bearer if present)
    if (leadToken.toLowerCase().startsWith('bearer ')) {
      leadToken = leadToken.slice(7).trim();
    }

    // Verify Lead
    const lead = await Lead.findOne({ where: { lead_token: leadToken } });
    if (!lead) {
      console.warn(`[Payment] Lead not found for token: ${leadToken.substring(0, 10)}...`);
      return res.status(403).json({ error: 'Invalid lead token' });
    }

    // Verify PDF
    const pdf = await PdfDocument.findByPk(pdfId);
    if (!pdf) {
      return res.status(404).json({ error: 'PDF not found' });
    }

    // Check if already purchased and completed
    const existing = await PdfPurchase.findOne({
      where: { lead_id: lead.id, pdf_id: pdfId, status: 'completed' }
    });
    if (existing) {
      return res.json({ alreadyPurchased: true });
    }

    // Razorpay Order Options
    const options = {
      amount: PDF_PRICE_PAISE,
      currency: CURRENCY,
      receipt: `pdf_${pdfId}_lead_${lead.id}`,
      notes: {
        pdf_title: pdf.title,
        lead_name: lead.name,
        lead_phone: lead.phone
      }
    };

    console.log(`[Payment] Creating Razorpay order for Lead ${lead.id}, PDF ${pdfId}`);
    
    const order = await createRazorpayClient().orders.create(options);

    if (!order || !order.id) {
      throw new Error('Razorpay failed to return an order ID');
    }

    // Create a pending purchase record
    await PdfPurchase.create({
      lead_id: lead.id,
      pdf_id: pdfId,
      amount: PDF_PRICE_PAISE,
      razorpay_order_id: order.id,
      status: 'pending'
    });

    // Send order details back to frontend
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key_id: RAZORPAY_KEY_ID // Ensure this matches what was used to create the order
    });

  } catch (err) {
    console.error('[Payment] Razorpay Order Error:', err);
    
    // Check for Razorpay specific errors
    if (err.statusCode === 401) {
      return res.status(500).json({ 
        error: 'Razorpay authentication failed. Please check your API keys in .env.',
        details: 'The provided key_id or key_secret is invalid.'
      });
    }

    res.status(500).json({ 
      error: 'Failed to create payment order',
      details: err.message,
      razorpay_error: err.error || err
    });
  }
});

/**
 * POST /api/payment/verify-payment
 * Verifies the Razorpay payment signature and completes the purchase.
 */
router.post('/verify-payment', async (req, res) => {
  try {
    let {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      pdfId,
      leadToken
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Payment details are missing' });
    }

    // Clean token
    if (leadToken && leadToken.toLowerCase().startsWith('bearer ')) {
      leadToken = leadToken.slice(7).trim();
    }

    // Verify Signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    console.log(`[Payment] Verifying signature for Order ${razorpay_order_id}`);
    
    if (expectedSignature !== razorpay_signature) {
      console.error('[Payment] Signature mismatch!');
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Find the pending purchase
    const purchase = await PdfPurchase.findOne({
      where: { razorpay_order_id: razorpay_order_id }
    });

    if (!purchase) {
      console.error(`[Payment] Purchase record not found for Order ${razorpay_order_id}`);
      return res.status(404).json({ error: 'Purchase record not found' });
    }

    // Update purchase status
    await purchase.update({
      razorpay_payment_id,
      razorpay_signature,
      status: 'completed'
    });

    console.log(`[Payment] Purchase completed for Lead ${purchase.lead_id}, PDF ${purchase.pdf_id}`);

    res.json({ success: true });

  } catch (err) {
    console.error('[Payment] Payment Verification Error:', err);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

/**
 * POST /api/payment/webhook
 * Handles Razorpay webhooks for asynchronous payment status updates.
 */
router.post('/webhook', async (req, res) => {
  try {
    const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || RAZORPAY_KEY_SECRET;
    const signature = req.headers['x-razorpay-signature'];

    if (!signature) {
      return res.status(400).json({ error: 'Webhook signature missing' });
    }

    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (expectedSignature !== signature) {
      console.warn('[Payment Webhook] Signature mismatch');
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    const { event, payload } = req.body;
    console.log(`[Payment Webhook] Received event: ${event}`);

    if (event === 'payment.captured') {
      const orderId = payload.payment.entity.order_id;
      const paymentId = payload.payment.entity.id;

      const purchase = await PdfPurchase.findOne({ where: { razorpay_order_id: orderId } });
      if (purchase && purchase.status !== 'completed') {
        await purchase.update({
          razorpay_payment_id: paymentId,
          status: 'completed'
        });
        console.log(`[Payment Webhook] Updated purchase for order ${orderId} to completed`);
      }
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('[Payment Webhook] Error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * GET /api/payment/status/:pdfId
 * Checks if a lead has already purchased a specific PDF.
 */
router.get('/status/:pdfId', async (req, res) => {
  try {
    let leadToken = req.headers.authorization || req.query.token;
    if (!leadToken) return res.json({ purchased: false });

    if (leadToken.toLowerCase().startsWith('bearer ')) {
      leadToken = leadToken.slice(7).trim();
    }

    const lead = await Lead.findOne({ where: { lead_token: leadToken } });
    if (!lead) return res.json({ purchased: false });

    const purchase = await PdfPurchase.findOne({
      where: { lead_id: lead.id, pdf_id: req.params.pdfId, status: 'completed' }
    });

    res.json({ purchased: !!purchase });
  } catch (err) {
    console.error('[Payment] Status Check Error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
