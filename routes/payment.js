const express = require('express');
const router = express.Router();
const axios = require('axios');
const sha256 = require('sha256');
const uniqid = require('uniqid');
const { PdfPurchase, PdfDocument, Lead } = require('../models');

// PhonePe Configuration
const MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID || 'PGTESTPAYUAT';
const SALT_KEY = process.env.PHONEPE_SALT_KEY || '099eb0cd-02cf-4e2a-8aca-3e6c6aff0399';
const SALT_INDEX = process.env.PHONEPE_SALT_INDEX || 1;
const PHONEPE_ENV = process.env.PHONEPE_ENV || 'sandbox'; // 'sandbox' or 'production'

// Base URLs for PhonePe
const BASE_URLS = {
  sandbox: 'https://api-preprod.phonepe.com/apis/pg-sandbox',
  production: 'https://api.phonepe.com/apis/hermes'
};
const HOST_URL = BASE_URLS[PHONEPE_ENV];

const PDF_PRICE_PAISE = 1000; // 10 INR
const CURRENCY = 'INR';

const buildPhonePeRedirectUrl = (req, merchantTransactionId) => {
  const defaultRedirectUrl = `${req.protocol}://${req.get('host')}/api/payment/status/${merchantTransactionId}`;
  const configuredRedirectUrl = process.env.PHONEPE_REDIRECT_URL?.trim();

  if (!configuredRedirectUrl) return defaultRedirectUrl;

  if (configuredRedirectUrl.includes(':merchantTransactionId')) {
    return configuredRedirectUrl.replace(':merchantTransactionId', merchantTransactionId);
  }

  if (configuredRedirectUrl.includes(merchantTransactionId)) {
    return configuredRedirectUrl;
  }

  if (/\/api\/payment\/status\/?$/.test(configuredRedirectUrl)) {
    return `${configuredRedirectUrl.replace(/\/$/, '')}/${merchantTransactionId}`;
  }

  return defaultRedirectUrl;
};

const extractToken = (authHeader = '') => {
  if (!authHeader) return '';
  if (authHeader.toLowerCase().startsWith('bearer ')) return authHeader.slice(7).trim();
  return authHeader.trim();
};

/**
 * POST /api/payment/create-order
 * Initiates a PhonePe payment for a specific PDF and Lead.
 */
router.post('/create-order', async (req, res) => {
  try {
    // Verbose debug: log request body and safe headers (do not log Authorization)
    try {
      const safeHeaders = {
        host: req.get('host'),
        origin: req.headers.origin,
        'user-agent': req.headers['user-agent'],
        'content-type': req.headers['content-type']
      };
      console.log('[Payment][DEBUG] create-order request', { body: req.body, headers: safeHeaders });
    } catch (e) {
      console.warn('[Payment][DEBUG] failed to stringify request for logging', e && e.message);
    }

    let { pdfId, leadToken } = req.body;

    if (!pdfId || !leadToken) {
      return res.status(400).json({ error: 'PDF ID and Lead Token are required' });
    }

    // Clean token
    leadToken = extractToken(leadToken);

    // Verify Lead
    const lead = await Lead.findOne({ where: { lead_token: leadToken } });
    if (!lead) {
      return res.status(403).json({ error: 'Invalid lead token' });
    }

    // Verify PDF
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

    const merchantTransactionId = `TXN_${uniqid().toUpperCase()}`;
    const redirectUrl = buildPhonePeRedirectUrl(req, merchantTransactionId);
    
    const payload = {
      merchantId: MERCHANT_ID,
      merchantTransactionId: merchantTransactionId,
      merchantUserId: `USER_${lead.id}`,
      amount: PDF_PRICE_PAISE,
      redirectUrl: redirectUrl,
      redirectMode: 'REDIRECT',
      callbackUrl: process.env.PHONEPE_WEBHOOK_URL || `${req.protocol}://${req.get('host')}/api/payment/webhook`,
      mobileNumber: lead.phone.replace(/\D/g, '').slice(-10),
      paymentInstrument: {
        type: 'PAY_PAGE'
      }
    };

    // 1. Base64 Encode Payload
    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');

    // 2. Generate Checksum (X-VERIFY)
    const stringToHash = base64Payload + '/pg/v1/pay' + SALT_KEY;
    const checksum = sha256(stringToHash) + '###' + SALT_INDEX;

    // 3. Create Pending Purchase Record
    await PdfPurchase.create({
      lead_id: lead.id,
      pdf_id: pdfId,
      amount: PDF_PRICE_PAISE,
      transaction_id: merchantTransactionId,
      status: 'pending'
    });

    console.log(`[Payment] Initiating PhonePe payment for Lead ${lead.id}, PDF ${pdfId}, TXN ${merchantTransactionId}`);
    console.log(`[Payment] Using redirectUrl: ${redirectUrl}`);

    // 4. Call PhonePe API
    const response = await axios.post(
      `${HOST_URL}/pg/v1/pay`,
      { request: base64Payload },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-VERIFY': checksum,
          'accept': 'application/json'
        }
      }
    );

    console.log('[Payment] PhonePe response:', response.data);

    if (response.data.success && response.data.data.instrumentResponse.redirectInfo.url) {
      return res.json({
        success: true,
        redirectUrl: response.data.data.instrumentResponse.redirectInfo.url,
        transactionId: merchantTransactionId
      });
    } else {
      throw new Error(response.data.message || 'PhonePe initiation failed');
    }

  } catch (err) {
    // Log as much useful debug information as possible without exposing secrets
    console.error('[Payment] PhonePe Initiation Error - message:', err.message);
    if (err.stack) console.error('[Payment] Stack:', err.stack);
    if (err.response) {
      console.error('[Payment] PhonePe response error data:', err.response.data);
      console.error('[Payment] PhonePe response status:', err.response.status);
    }
    res.status(500).json({ 
      error: 'Failed to initiate payment',
      details: err.response?.data?.message || err.message
    });
  }
});

/**
 * Landing page endpoint for payment redirects.
 * PhonePe will redirect the user here; this page posts a message back to the opener
 * (the frontend popup) and then forwards the user to the frontend PDF listing.
 */
router.get('/landing/:merchantTransactionId', async (req, res) => {
  const { merchantTransactionId } = req.params;
  try {
    const purchase = await PdfPurchase.findOne({ where: { transaction_id: merchantTransactionId } });
    if (!purchase) {
      return res.status(404).send('Transaction not found');
    }

    const frontendBaseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const pdfId = purchase.pdf_id;
    const status = purchase.status === 'completed' ? 'success' : purchase.status === 'failed' ? 'failed' : 'pending';

    // Render a minimal HTML page that posts a message to the opener and shows a friendly UI.
    return res.send(`<!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <title>Payment Result</title>
          <style>body{font-family:Inter,system-ui,Arial,Helvetica,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0f172a;color:#fff} .card{max-width:520px;padding:28px;border-radius:16px;background:#0b1220;text-align:center}</style>
        </head>
        <body>
          <div class="card">
            <h2>${status === 'success' ? 'Payment Successful' : status === 'failed' ? 'Payment Failed' : 'Payment Pending'}</h2>
            <p style="opacity:0.85;margin-top:12px">You can close this window or continue to view your document.</p>
            <div style="margin-top:18px;display:flex;gap:8px;justify-content:center">
              <button id="closeBtn" style="padding:10px 18px;border-radius:10px;border:none;cursor:pointer">Close Window</button>
              <a id="continueLink" href="${frontendBaseUrl}/pdfs?payment_status=${status}&pdfId=${pdfId}" style="text-decoration:none"><button style="padding:10px 18px;border-radius:10px;background:#ff7a18;border:none;color:#fff;cursor:pointer">Continue</button></a>
            </div>
          </div>
          <script>
            (function(){
              try {
                const msg = { type: 'phonepe-payment-success', pdfId: '${pdfId}', status: '${status}' };
                if (window.opener && !window.opener.closed) {
                  // Use wildcard targetOrigin here; opener will validate origin in the frontend.
                  window.opener.postMessage(msg, '*');
                }
              } catch (e) {
                console.warn('Landing postMessage error', e);
              }
              document.getElementById('closeBtn').addEventListener('click', function(){ window.close(); });
            })();
          </script>
        </body>
      </html>
    `);
  } catch (err) {
    console.error('[Payment Landing] Error:', err);
    res.status(500).send('Server error');
  }
});

/**
 * GET /api/payment/status/:merchantTransactionId
 * Handles the redirect from PhonePe after payment attempt.
 */
router.get('/status/:merchantTransactionId', async (req, res) => {
  const { merchantTransactionId } = req.params;

  try {
    // Generate Checksum for Status Check
    const stringToHash = `/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}` + SALT_KEY;
    const checksum = sha256(stringToHash) + '###' + SALT_INDEX;

    console.log(`[Payment] Checking status for TXN ${merchantTransactionId}`);

    const options = {
      method: 'GET',
      url: `${HOST_URL}/pg/v1/status/${MERCHANT_ID}/${merchantTransactionId}`,
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'X-VERIFY': checksum,
        'X-MERCHANT-ID': MERCHANT_ID
      }
    };

    const response = await axios.request(options);
    const purchase = await PdfPurchase.findOne({ where: { transaction_id: merchantTransactionId } });

    if (!purchase) {
      return res.status(404).send('Transaction record not found');
    }

    const frontendBaseUrl = process.env.FRONTEND_URL || 'https://dholeraplatform.com';
    const redirectPath = `/pdfs?payment_status=`;

    if (response.data.code === 'PAYMENT_SUCCESS') {
      await purchase.update({
        gateway_payment_id: response.data.data.transactionId,
        status: 'completed'
      });
      console.log(`[Payment] TXN ${merchantTransactionId} SUCCESS`);
      return res.redirect(`${frontendBaseUrl}${redirectPath}success&pdfId=${purchase.pdf_id}`);
    } else if (response.data.code === 'PAYMENT_ERROR' || response.data.code === 'PAYMENT_DECLINED') {
      await purchase.update({ status: 'failed' });
      console.log(`[Payment] TXN ${merchantTransactionId} FAILED: ${response.data.code}`);
      return res.redirect(`${frontendBaseUrl}${redirectPath}failed`);
    } else {
      // Pending or unknown status
      return res.redirect(`${frontendBaseUrl}${redirectPath}pending`);
    }

  } catch (err) {
    console.error('[Payment] Status Check Error:', err.response?.data || err.message);
    res.status(500).send('Error checking payment status');
  }
});

/**
 * POST /api/payment/webhook
 * Handles PhonePe server-to-server callbacks.
 */
router.post('/webhook', async (req, res) => {
  try {
    const { response: base64Response } = req.body;
    
    // Verify Webhook Signature (X-VERIFY from headers)
    const xVerifyHeader = req.headers['x-verify'];
    const stringToHash = base64Response + SALT_KEY;
    const expectedChecksum = sha256(stringToHash) + '###' + SALT_INDEX;

    if (xVerifyHeader !== expectedChecksum) {
      console.warn('[Payment Webhook] Signature mismatch');
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }

    // Decode Payload
    const payload = JSON.parse(Buffer.from(base64Response, 'base64').toString());
    console.log(`[Payment Webhook] Received: ${payload.code} for ${payload.data.merchantTransactionId}`);

    if (payload.code === 'PAYMENT_SUCCESS') {
      const purchase = await PdfPurchase.findOne({ where: { transaction_id: payload.data.merchantTransactionId } });
      if (purchase && purchase.status !== 'completed') {
        await purchase.update({
          gateway_payment_id: payload.data.transactionId,
          status: 'completed'
        });
        console.log(`[Payment Webhook] Updated TXN ${payload.data.merchantTransactionId} to completed`);
      }
    } else if (payload.code === 'PAYMENT_ERROR' || payload.code === 'PAYMENT_DECLINED') {
      const purchase = await PdfPurchase.findOne({ where: { transaction_id: payload.data.merchantTransactionId } });
      if (purchase && purchase.status === 'pending') {
        await purchase.update({ status: 'failed' });
      }
    }

    res.json({ status: 'ok' });
  } catch (err) {
    console.error('[Payment Webhook] Error:', err);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * GET /api/payment/status-check/:pdfId
 */
router.get('/status-check/:pdfId', async (req, res) => {
  try {
    let leadToken = req.headers.authorization || req.query.token;
    if (!leadToken) return res.json({ purchased: false });

    leadToken = extractToken(String(leadToken));

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

/**
 * GET /api/payment/my-purchases
 */
router.get('/my-purchases', async (req, res) => {
  try {
    const leadToken = extractToken(req.headers.authorization || req.query.token || '');
    if (!leadToken) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const lead = await Lead.findOne({ where: { lead_token: leadToken, verified: true } });
    if (!lead) {
      return res.status(401).json({ error: 'Invalid lead token' });
    }

    const purchases = await PdfPurchase.findAll({
      where: { lead_id: lead.id, status: 'completed' },
      include: [
        {
          model: PdfDocument,
          attributes: ['id', 'title', 'category', 'file_path', 'is_protected']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.json({
      lead: { id: lead.id, name: lead.name, phone: lead.phone, email: lead.email },
      purchases: purchases.map((p) => ({
        id: p.id,
        pdf_id: p.pdf_id,
        amount: p.amount,
        currency: p.currency,
        status: p.status,
        transaction_id: p.transaction_id,
        gateway_payment_id: p.gateway_payment_id,
        purchasedAt: p.createdAt,
        document: p.PdfDocument
          ? {
              id: p.PdfDocument.id,
              title: p.PdfDocument.title,
              category: p.PdfDocument.category,
              file_path: p.PdfDocument.file_path,
              is_protected: p.PdfDocument.is_protected
            }
          : null
      }))
    });
  } catch (err) {
    console.error('[Payment] My Purchases Error:', err);
    return res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

module.exports = router;
