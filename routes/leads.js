const express = require('express');
const router = express.Router();
const { Lead, VisitorSession, PdfView, PdfDocument, Update, UserSession, Setting, AuditLog } = require('../models');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const { verifyToken } = require('./auth');
const { sendOtpEmail } = require('../services/emailService');
const { 
  sendOtpOnWhatsapp, 
  normalizePhone, 
  buildManualWhatsAppMessage, 
  logWhatsAppActivity 
} = require('../services/whatsapp');
const { logAuditEvent } = require('../services/auditLogger');
const { maybeNotifyHighInterestLead, isHighInterestLead } = require('../services/leadNotifications');
const { cleanText, cleanEmail, cleanPathFragment, parsePositiveInt } = require('../utils/sanitize');
const multer = require('multer');
const memoryUpload = multer({ storage: multer.memoryStorage() });

const OTP_TTL_MS = 5 * 60 * 1000;
const PASSCODE_SETUP_TTL_MS = Number.parseInt(process.env.PASSCODE_SETUP_TTL_MS || `${10 * 60 * 1000}`, 10);
const OTP_SEND_WINDOW_MS = Number.parseInt(process.env.OTP_SEND_WINDOW_MS || `${15 * 60 * 1000}`, 10);
const OTP_SEND_MAX = Number.parseInt(process.env.OTP_SEND_MAX || '10', 10);
const OTP_VERIFY_WINDOW_MS = Number.parseInt(process.env.OTP_VERIFY_WINDOW_MS || `${15 * 60 * 1000}`, 10);
const OTP_VERIFY_MAX = Number.parseInt(process.env.OTP_VERIFY_MAX || '15', 10);
const PASSCODE_LOGIN_WINDOW_MS = Number.parseInt(process.env.PASSCODE_LOGIN_WINDOW_MS || `${15 * 60 * 1000}`, 10);
const PASSCODE_LOGIN_MAX = Number.parseInt(process.env.PASSCODE_LOGIN_MAX || '10', 10);

const otpSendLimiter = rateLimit({
  windowMs: OTP_SEND_WINDOW_MS,
  max: OTP_SEND_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OTP requests. Please wait and try again.' }
});

const otpVerifyLimiter = rateLimit({
  windowMs: OTP_VERIFY_WINDOW_MS,
  max: OTP_VERIFY_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many verification attempts. Please wait and try again.' }
});

const passcodeLoginLimiter = rateLimit({
  windowMs: PASSCODE_LOGIN_WINDOW_MS,
  max: PASSCODE_LOGIN_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please wait and try again.' }
});

const hashOtp = (otp) => crypto.createHash('sha256').update(String(otp)).digest('hex');
const hashSetupToken = (token) => crypto.createHash('sha256').update(String(token)).digest('hex');
const isValidPhone = (phone) => /^[6-9]\d{9}$/.test(phone);
const ALLOWED_LEAD_STATUSES = new Set(['New', 'Contacted', 'Converted', 'Follow-up', 'Not Interested', 'Closed']);

const extractToken = (authHeader = '') => {
  if (!authHeader) return '';
  if (authHeader.toLowerCase().startsWith('bearer ')) return authHeader.slice(7).trim();
  return authHeader.trim();
};

const safeJsonParse = (value, fallback = []) => {
  try {
    const parsed = JSON.parse(value || '[]');
    return Array.isArray(parsed) ? parsed : fallback;
  } catch (err) {
    return fallback;
  }
};

const getLeadContext = async (lead) => {
  const plainLead = lead?.get ? lead.get({ plain: true }) : { ...lead };
  const sessions = plainLead.browserFingerprint
    ? await VisitorSession.findAll({
        where: { browserFingerprint: plainLead.browserFingerprint },
        order: [['createdAt', 'DESC']]
      })
    : [];

  const pdfViews = plainLead.id
    ? await PdfView.findAll({
        where: { lead_id: plainLead.id },
        include: [PdfDocument],
        order: [['createdAt', 'DESC']]
      })
    : [];

  const sessionPages = sessions.flatMap((session) => safeJsonParse(session.visitedPages, []));
  const leadPages = safeJsonParse(plainLead.visited_pages, []);
  const pages = [...new Set([...leadPages, ...sessionPages])];

  return {
    plainLead,
    sessions,
    pdfViews,
    pages,
    total_sessions: sessions.length,
    totalTimeSpent: (plainLead.timeSpent || 0) + sessions.reduce((acc, session) => acc + (session.timeSpent || 0), 0),
    pdf_view_count: pdfViews.length
  };
};

const maybeNotifyLeadIfHighInterest = async (lead, context = {}) => {
  const leadData = lead?.get ? lead.get({ plain: true }) : { ...lead };
  const notificationContext = {
    pages: context.pages || safeJsonParse(leadData.visited_pages, []),
    sessions: context.sessions || [],
    views: context.pdfViews || context.views || []
  };
  const mergedLeadData = {
    ...leadData,
    timeSpent: context.totalTimeSpent ?? leadData.timeSpent,
    pdf_view_count: notificationContext.views.length
  };

  if (!isHighInterestLead(mergedLeadData)) {
    return { notified: false, reason: 'not_high_interest' };
  }

  if (leadData.high_interest_whatsapp_notified_at && leadData.high_interest_email_notified_at) {
    return { notified: false, reason: 'already_notified' };
  }

  const result = await maybeNotifyHighInterestLead(mergedLeadData, notificationContext);
  const updates = {};
  if (result.whatsapp?.sent && !leadData.high_interest_whatsapp_notified_at) {
    updates.high_interest_whatsapp_notified_at = new Date();
  }
  if (result.email?.sent && !leadData.high_interest_email_notified_at) {
    updates.high_interest_email_notified_at = new Date();
  }
  if (Object.keys(updates).length && lead?.update) {
    await lead.update(updates);
  }

  return result;
};

// GET all leads (Admin) - with filters and search
router.get('/', verifyToken, async (req, res) => {
  try {
    const status = cleanText(req.query?.status, 40);
    const source = cleanText(req.query?.source, 80);
    const search = cleanText(req.query?.search, 80).replace(/[%_]/g, '');
    const days = parsePositiveInt(req.query?.days, 0, 3650);
    
    // Pagination
    const page = parsePositiveInt(req.query?.page, 1, 1000);
    const limit = parsePositiveInt(req.query?.limit, 1, 100);
    const offset = (page - 1) * limit;

    const where = {};
    
    if (status && ALLOWED_LEAD_STATUSES.has(status)) where.status = status;
    if (source) where.source = source;
    if (days) {
      const date = new Date();
      date.setDate(date.getDate() - days);
      where.createdAt = { [Op.gte]: date };
    }
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    const { count, rows: leads } = await Lead.findAndCountAll({ 
      where, 
      include: [{
        model: PdfView,
        include: [PdfDocument]
      }],
      order: [['createdAt', 'DESC']],
      limit,
      offset
    });

    // Manually attach VisitorSession data for each lead based on fingerprint
    const leadsWithIntelligence = await Promise.all(leads.map(async (lead) => {
      const plainLead = lead.get({ plain: true });
      if (plainLead.browserFingerprint) {
        const sessions = await VisitorSession.findAll({
          where: { browserFingerprint: plainLead.browserFingerprint },
          order: [['createdAt', 'DESC']]
        });
        plainLead.sessions = sessions;
        plainLead.total_sessions = sessions.length;
        
        // Re-calculate total time spent including anonymous sessions
        plainLead.totalTimeSpent = (plainLead.timeSpent || 0) + sessions.reduce((acc, s) => acc + (s.timeSpent || 0), 0);

        // Merge visited pages from Lead and all associated sessions
        const sessionPages = sessions.flatMap((s) => safeJsonParse(s.visitedPages, []));
        const leadPages = safeJsonParse(plainLead.visited_pages, []);
        plainLead.visited_pages = JSON.stringify([...new Set([...leadPages, ...sessionPages])]);
      } else {
        plainLead.sessions = [];
        plainLead.total_sessions = 0;
        plainLead.totalTimeSpent = plainLead.timeSpent || 0;
      }
      return plainLead;
    }));

    res.json(leadsWithIntelligence);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET check if visitor is already verified by fingerprint
router.get('/check-visitor/:fingerprint', async (req, res) => {
  try {
    const fingerprint = cleanText(req.params?.fingerprint, 120);
    if (!/^fp_[a-z0-9]+$/i.test(fingerprint)) {
      return res.status(400).json({ error: 'Invalid fingerprint format.' });
    }

    const lead = await Lead.findOne({ 
      where: { browserFingerprint: fingerprint, verified: true },
      order: [['updatedAt', 'DESC']]
    });
    
    if (lead) {
      // Update visit count if it's a new session (determined by frontend)
      await lead.update({ 
        returning_visitor: true,
        visit_count: lead.visit_count + 1
      });
      return res.json({ verified: true, lead_token: lead.lead_token, lead: { name: lead.name, email: lead.email, phone: lead.phone } });
    }
    
    res.json({ verified: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST save lead directly (without OTP verification)
router.post('/save-direct', async (req, res) => {
  try {
    const name = cleanText(req.body?.name, 120);
    const email = cleanEmail(req.body?.email);
    const sessionId = cleanText(req.body?.sessionId, 100);
    const browserFingerprint = cleanText(req.body?.browserFingerprint, 120);
    const phone = cleanText(req.body?.phone, 20);

    const normalizedPhone = normalizePhone(phone);
    const localPhone = normalizedPhone.startsWith('91') && normalizedPhone.length === 12
      ? normalizedPhone.slice(2)
      : normalizedPhone;

    if (!name || !localPhone) {
      await logAuditEvent({
        eventType: 'lead.save.direct.failed',
        actorType: 'lead',
        actorId: localPhone || null,
        success: false,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: { reason: 'missing_name_or_phone' }
      });
      return res.status(400).json({ error: 'Name and phone are required.' });
    }

    if (!isValidPhone(localPhone)) {
      await logAuditEvent({
        eventType: 'lead.save.direct.failed',
        actorType: 'lead',
        actorId: localPhone,
        success: false,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: { reason: 'invalid_phone' }
      });
      return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
    }

    // Generate lead token
    const leadToken = crypto.randomBytes(16).toString('hex');
    let timeSpent = 0;
    let visitedPages = '[]';
    
    if (sessionId) {
      const session = await VisitorSession.findOne({ where: { sessionId } });
      if (session) {
        timeSpent = session.timeSpent;
        visitedPages = session.visitedPages;
      }
    }

    // Create or update lead
    let lead = await Lead.findOne({ where: { phone: localPhone } });

    if (lead) {
      // Update existing lead
      await lead.update({
        name: name || lead.name,
        email: email || lead.email,
        browserFingerprint: browserFingerprint || lead.browserFingerprint,
        lead_token: leadToken,
        verified: true,
        status: lead.status || 'New'
      });
    } else {
      // Create new lead
      lead = await Lead.create({
        name,
        phone: localPhone,
        email,
        source: 'Direct Save',
        browserFingerprint,
        lead_token: leadToken,
        verified: true,
        status: 'New'
      });
    }

    await logAuditEvent({
      eventType: 'lead.save.direct.success',
      actorType: 'lead',
      actorId: localPhone,
      success: true,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: { source: 'Direct Save', leadId: lead.id }
    });

    const leadContext = await getLeadContext(lead);
    await maybeNotifyLeadIfHighInterest(lead, leadContext);

    res.json({ 
      success: true, 
      lead_token: leadToken,
      lead: {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        email: lead.email
      }
    });
  } catch (err) {
    console.error('Error in save-direct:', err);
    await logAuditEvent({
      eventType: 'lead.save.direct.failed',
      actorType: 'lead',
      success: false,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: { reason: 'exception', message: err.message }
    });
    res.status(500).json({ error: err.message });
  }
});

// POST send OTP to mobile
router.post('/send-otp', otpSendLimiter, async (req, res) => {
  try {
    const name = cleanText(req.body?.name, 120);
    const email = cleanEmail(req.body?.email);
    const sessionId = cleanText(req.body?.sessionId, 100);
    const browserFingerprint = cleanText(req.body?.browserFingerprint, 120);
    const phone = cleanText(req.body?.phone, 20);

    const normalizedPhone = normalizePhone(phone);
    const localPhone = normalizedPhone.startsWith('91') && normalizedPhone.length === 12
      ? normalizedPhone.slice(2)
      : normalizedPhone;

    if (!name || !localPhone) {
      await logAuditEvent({
        eventType: 'lead.otp.send.failed',
        actorType: 'lead',
        actorId: localPhone || null,
        success: false,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: { reason: 'missing_name_or_phone' }
      });
      return res.status(400).json({ error: 'Name and phone are required.' });
    }

    if (!isValidPhone(localPhone)) {
      await logAuditEvent({
        eventType: 'lead.otp.send.failed',
        actorType: 'lead',
        actorId: localPhone,
        success: false,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: { reason: 'invalid_phone' }
      });
      return res.status(400).json({ error: 'Please enter a valid 10-digit Indian mobile number.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + OTP_TTL_MS);
    const otpHash = hashOtp(otp);

    let lead = await Lead.findOne({ where: { phone: localPhone } });

    if (lead) {
      await lead.update({ 
        name: name || lead.name,
        email: email || lead.email,
        otp: otpHash,
        otp_expiry: expiry,
        browserFingerprint: browserFingerprint || lead.browserFingerprint
      });
    } else {
      lead = await Lead.create({
        name,
        phone: localPhone,
        email,
        source: 'OTP Verification',
        otp: otpHash,
        otp_expiry: expiry,
        browserFingerprint,
        verified: false
      });
    }

    const whatsappResult = await sendOtpOnWhatsapp({ phone: localPhone, otp });

    await logAuditEvent({
      eventType: 'lead.otp.send.success',
      actorType: 'lead',
      actorId: localPhone,
      success: true,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: {
        provider: whatsappResult.provider,
        fallback: whatsappResult.provider === 'fallback'
      }
    });

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (err) {
    await logAuditEvent({
      eventType: 'lead.otp.send.failed',
      actorType: 'lead',
      success: false,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: { reason: 'exception', message: err.message }
    });
    res.status(500).json({ error: err.message });
  }
});

// POST verify OTP
router.post('/verify-otp', otpVerifyLimiter, async (req, res) => {
  try {
    const otp = cleanText(req.body?.otp, 10);
    const sessionId = cleanText(req.body?.sessionId, 100);
    const phone = cleanText(req.body?.phone, 20);

    const normalizedPhone = normalizePhone(phone);
    const localPhone = normalizedPhone.startsWith('91') && normalizedPhone.length === 12
      ? normalizedPhone.slice(2)
      : normalizedPhone;

    if (!isValidPhone(localPhone) || !/^\d{6}$/.test(String(otp || ''))) {
      await logAuditEvent({
        eventType: 'lead.otp.verify.failed',
        actorType: 'lead',
        actorId: localPhone || null,
        success: false,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: { reason: 'invalid_format' }
      });
      return res.status(400).json({ error: 'Invalid phone or OTP format.' });
    }

    const lead = await Lead.findOne({ where: { phone: localPhone } });

    if (!lead) {
      await logAuditEvent({
        eventType: 'lead.otp.verify.failed',
        actorType: 'lead',
        actorId: localPhone,
        success: false,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: { reason: 'lead_not_found' }
      });
      return res.status(404).json({ error: 'Lead not found' });
    }
    if (!lead.otp || hashOtp(otp) !== lead.otp) {
      await logAuditEvent({
        eventType: 'lead.otp.verify.failed',
        actorType: 'lead',
        actorId: localPhone,
        success: false,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: { reason: 'invalid_otp' }
      });
      return res.status(400).json({ error: 'Invalid OTP' });
    }
    if (new Date() > lead.otp_expiry) {
      await logAuditEvent({
        eventType: 'lead.otp.verify.failed',
        actorType: 'lead',
        actorId: localPhone,
        success: false,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
        details: { reason: 'otp_expired' }
      });
      return res.status(400).json({ error: 'OTP expired' });
    }

    // Success -> Verify Lead
    const leadToken = crypto.randomBytes(16).toString('hex');
    let session = null;
    
    if (sessionId) {
      session = await VisitorSession.findOne({ where: { sessionId } });
    }

    await lead.update({
      verified: true,
      lead_token: leadToken,
      otp: null, // Clear OTP
      otp_expiry: null,
      visit_count: lead.visit_count + 1,
      returning_visitor: lead.visit_count > 0
    });

    // Calculate full context for notification (without double counting by summing dynamically)
    const sessions = await VisitorSession.findAll({ where: { browserFingerprint: lead.browserFingerprint } });
    const sessionPages = sessions.flatMap((s) => safeJsonParse(s.visitedPages, []));
    const leadPages = safeJsonParse(lead.visited_pages, []);
    const mergedPages = [...new Set([...leadPages, ...sessionPages])];
    const totalTimeSpent = (lead.timeSpent || 0) + sessions.reduce((acc, s) => acc + (s.timeSpent || 0), 0);

    await maybeNotifyLeadIfHighInterest(lead, {
      sessions,
      pages: mergedPages,
      totalTimeSpent,
      pdfViews: await PdfView.findAll({ where: { lead_id: lead.id }, include: [PdfDocument], order: [['createdAt', 'DESC']] })
    });

    await logAuditEvent({
      eventType: 'lead.otp.verify.success',
      actorType: 'lead',
      actorId: localPhone,
      success: true,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ success: true, lead_token: leadToken, lead: { name: lead.name, email: lead.email, phone: lead.phone } });
  } catch (err) {
    await logAuditEvent({
      eventType: 'lead.otp.verify.failed',
      actorType: 'lead',
      success: false,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: { reason: 'exception', message: err.message }
    });
    res.status(500).json({ error: err.message });
  }
});

// POST verify lead from PDF lock (LEGACY - keeping for compatibility but redirecting to OTP flow or updating)
router.post('/verify', async (req, res) => {
  // We can keep this for direct verification if needed, or point it to OTP
  // For now, let's keep it but mark it as "Auto-verify" for convenience or remove it.
  // The user asked for OTP, so we should prioritize that.
  res.status(400).json({ error: 'Please use /send-otp and /verify-otp flow.' });
});

// POST track returning verified user
router.post('/track-returning', async (req, res) => {
  try {
    const leadToken = extractToken(req.headers['authorization']);
    if (!leadToken) return res.status(403).json({ error: 'Missing token' });

    const page = cleanPathFragment(req.body?.page, 120);
    const timeSpent = parsePositiveInt(req.body?.timeSpent, 5, 60);
    
    const lead = await Lead.findOne({ where: { lead_token: leadToken } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    let pages = JSON.parse(lead.visited_pages || '[]');
    if (page && !pages.includes(page)) {
      pages.push(page);
    }

    // Accumulate time spent
    const newTime = (lead.timeSpent || 0) + (timeSpent || 5);
    
    await lead.update({
      timeSpent: newTime,
      visited_pages: JSON.stringify(pages),
      last_contacted: new Date()
    });

    const leadContext = await getLeadContext(lead);
    await maybeNotifyLeadIfHighInterest(lead, leadContext);

    res.json({ success: true, lead: { name: lead.name, email: lead.email, phone: lead.phone } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET verify lead token (Public/Lead)
router.get('/verify-token', async (req, res) => {
  try {
    const leadToken = extractToken(req.headers['authorization']);
    if (!leadToken) return res.status(401).json({ error: 'No token provided' });

    const lead = await Lead.findOne({ where: { lead_token: leadToken, verified: true } });
    if (!lead) {
      return res.status(404).json({ error: 'Lead session invalid or expired' });
    }

    res.json({ 
      valid: true, 
      lead: { 
        id: lead.id,
        name: lead.name, 
        email: lead.email, 
        phone: lead.phone,
        status: lead.status,
        source: lead.source,
        is_registered: lead.is_registered,
        is_trial: lead.is_trial,
        createdAt: lead.createdAt
      } 
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH update lead profile (Public/Lead with token)
router.patch('/profile', async (req, res) => {
  try {
    const leadToken = extractToken(req.headers['authorization']);
    if (!leadToken) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const lead = await Lead.findOne({ where: { lead_token: leadToken, verified: true } });
    if (!lead) {
      return res.status(404).json({ error: 'Lead session invalid or expired' });
    }

    const nextName = cleanText(req.body?.name, 120);
    const rawEmail = typeof req.body?.email === 'string' ? req.body.email : undefined;
    const nextEmail = rawEmail === undefined ? undefined : cleanEmail(rawEmail);

    if (rawEmail !== undefined && rawEmail.trim() && !nextEmail) {
      return res.status(400).json({ error: 'Invalid email format' });
    }

    const updates = {};
    if (nextName) updates.name = nextName;
    if (rawEmail !== undefined) updates.email = nextEmail || null;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No profile changes provided' });
    }

    await lead.update(updates);

    return res.json({
      success: true,
      lead: {
        id: lead.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        status: lead.status,
        source: lead.source,
        is_registered: lead.is_registered,
        createdAt: lead.createdAt
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET export leads to Excel (Admin)
router.get('/export', verifyToken, async (req, res) => {
  try {
    const leads = await Lead.findAll({
      include: [{
        model: PdfView,
        include: [PdfDocument]
      }],
      order: [['createdAt', 'DESC']]
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Leads');
    const sessionsSheet = workbook.addWorksheet('Visitor Sessions');
    const viewsSheet = workbook.addWorksheet('Document Views');
    const updatesSheet = workbook.addWorksheet('Property Updates');

    worksheet.columns = [
      { header: 'Name', key: 'name', width: 20 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Time Spent (s)', key: 'time_spent', width: 15 },
      { header: 'Source', key: 'source', width: 15 },
      { header: 'Visits', key: 'visit_count', width: 10 },
      { header: 'Total Sessions', key: 'total_sessions', width: 14 },
      { header: 'Document Views', key: 'document_views', width: 14 },
      { header: 'Pages Visited', key: 'pages_visited', width: 40 },
      { header: 'Created Date', key: 'createdAt', width: 20 },
      { header: 'Last Contacted', key: 'last_contacted', width: 20 }
    ];

    sessionsSheet.columns = [
      { header: 'Lead Name', key: 'lead_name', width: 20 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Fingerprint', key: 'browserFingerprint', width: 24 },
      { header: 'Session ID', key: 'sessionId', width: 24 },
      { header: 'Time Spent (s)', key: 'timeSpent', width: 15 },
      { header: 'Visited Pages', key: 'visitedPages', width: 50 },
      { header: 'Created Date', key: 'createdAt', width: 20 }
    ];

    viewsSheet.columns = [
      { header: 'Lead Name', key: 'lead_name', width: 20 },
      { header: 'Phone', key: 'phone', width: 15 },
      { header: 'Document', key: 'document', width: 30 },
      { header: 'Category', key: 'category', width: 18 },
      { header: 'Viewed At', key: 'viewedAt', width: 20 },
      { header: 'Time Spent (s)', key: 'timeSpent', width: 15 }
    ];

    updatesSheet.columns = [
      { header: 'Title', key: 'title', width: 30 },
      { header: 'Category', key: 'category', width: 15 },
      { header: 'Content', key: 'content', width: 50 },
      { header: 'Image URL', key: 'imageUrl', width: 30 },
      { header: 'Published', key: 'published', width: 10 },
      { header: 'Created At', key: 'createdAt', width: 20 }
    ];

    for (const lead of leads) {
      const context = await getLeadContext(lead);
      worksheet.addRow({
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        status: lead.status,
        time_spent: lead.timeSpent,
        source: lead.source,
        visit_count: lead.visit_count,
        total_sessions: context.total_sessions,
        document_views: context.pdf_view_count,
        pages_visited: context.pages.join(', '),
        createdAt: new Date(lead.createdAt).toLocaleString(),
        last_contacted: lead.last_contacted ? new Date(lead.last_contacted).toLocaleString() : ''
      });

      context.sessions.forEach((session) => {
        sessionsSheet.addRow({
          lead_name: lead.name,
          phone: lead.phone,
          browserFingerprint: lead.browserFingerprint,
          sessionId: session.sessionId,
          timeSpent: session.timeSpent,
          visitedPages: session.visitedPages,
          createdAt: new Date(session.createdAt).toLocaleString()
        });
      });

      context.pdfViews.forEach((view) => {
        viewsSheet.addRow({
          lead_name: lead.name,
          phone: lead.phone,
          document: view.PdfDocument?.title || 'Document',
          category: view.PdfDocument?.category || '',
          viewedAt: new Date(view.createdAt).toLocaleString(),
          timeSpent: view.time_spent || 0
        });
      });
    }

    // Add updates to sheet
    const { Update } = require('../models');
    const updates = await Update.findAll({ order: [['createdAt', 'DESC']] });
    updates.forEach((update) => {
      updatesSheet.addRow({
        title: update.title,
        category: update.category,
        content: update.content,
        imageUrl: update.imageUrl,
        published: update.published ? 'Yes' : 'No',
        createdAt: new Date(update.createdAt).toLocaleString()
      });
    });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=' + 'leads_export.xlsx');
    
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST a new lead (Public)
router.post('/', async (req, res) => {
  try {
    const name = cleanText(req.body?.name, 120);
    const email = cleanEmail(req.body?.email);
    const source = cleanText(req.body?.source, 80);
    const sessionId = cleanText(req.body?.sessionId, 100);
    const phone = cleanText(req.body?.phone, 20);

    const normalizedPhone = normalizePhone(phone);
    const localPhone = normalizedPhone.startsWith('91') && normalizedPhone.length === 12
      ? normalizedPhone.slice(2)
      : normalizedPhone;

    if (!name || !isValidPhone(localPhone)) {
      return res.status(400).json({ error: 'Valid name and phone are required.' });
    }

    let timeSpent = 0;
    let visitedPages = '[]';
    
    if (sessionId) {
      const session = await VisitorSession.findOne({ where: { sessionId } });
      if (session) {
        timeSpent = session.timeSpent;
        visitedPages = session.visitedPages;
      }
    }
    
    const lead = await Lead.create({
      name,
      phone: localPhone,
      email,
      source: source || 'Website',
      timeSpent,
      visited_pages: visitedPages
    });

    await maybeNotifyLeadIfHighInterest(lead, { pages: safeJsonParse(visitedPages, []), totalTimeSpent: timeSpent });
    
    res.status(201).json(lead);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update lead status (Admin)
router.put('/:id/status', verifyToken, async (req, res) => {
  try {
    const status = cleanText(req.body?.status, 40);
    if (!ALLOWED_LEAD_STATUSES.has(status)) {
      return res.status(400).json({ error: 'Invalid lead status' });
    }

    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    
    await lead.update({ status, last_contacted: new Date() });

    await maybeNotifyLeadIfHighInterest(lead);

    await logAuditEvent({
      eventType: 'lead.status.updated',
      actorType: 'admin',
      actorId: req.user?.role || 'admin',
      success: true,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: { leadId: lead.id, status }
    });

    res.json(lead);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT update lead notes (Admin)
router.put('/:id/notes', verifyToken, async (req, res) => {
  try {
    const notes = cleanText(req.body?.notes, 2000);
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    
    await lead.update({ notes });

    await logAuditEvent({
      eventType: 'lead.notes.updated',
      actorType: 'admin',
      actorId: req.user?.role || 'admin',
      success: true,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: { leadId: lead.id }
    });

    res.json(lead);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE a lead (Admin)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    await lead.destroy();

    await logAuditEvent({
      eventType: 'lead.deleted',
      actorType: 'admin',
      actorId: req.user?.role || 'admin',
      success: true,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: { leadId: req.params.id }
    });

    res.json({ message: 'Lead deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET WhatsApp URL for a lead (Admin)
router.get('/:id/whatsapp-url', verifyToken, async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    
    const url = await buildManualWhatsAppMessage(lead);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST log WhatsApp activity (Admin)
router.post('/:id/whatsapp-log', verifyToken, async (req, res) => {
  try {
    const leadId = req.params.id;
    const messageSent = req.body?.message_sent !== false;
    
    const log = await logWhatsAppActivity({ 
      leadId, 
      messageSent, 
      messageType: 'manual' 
    });

    await logAuditEvent({
      eventType: 'lead.whatsapp.manual_click',
      actorType: 'admin',
      actorId: req.user?.role || 'admin',
      success: true,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: { leadId, logId: log.id }
    });

    res.json({ success: true, log });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- NEW AUTH FLOW ROUTES ---

// 1. Onboard / Request OTP
router.post('/register-request', otpSendLimiter, async (req, res) => {
  try {
    const name = cleanText(req.body?.name, 120);
    const email = cleanEmail(req.body?.email);
    const phone = cleanText(req.body?.phone, 20);
    const browserFingerprint = cleanText(req.body?.browserFingerprint, 120);

    const normalizedPhone = normalizePhone(phone);
    const localPhone = normalizedPhone.startsWith('91') && normalizedPhone.length === 12
      ? normalizedPhone.slice(2)
      : normalizedPhone;

    if (!name || !email || !localPhone) {
      return res.status(400).json({ error: 'Name, Email and Phone are required.' });
    }

    if (!isValidPhone(localPhone)) {
      return res.status(400).json({ error: 'Invalid 10-digit mobile number.' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + OTP_TTL_MS);
    const otpHash = hashOtp(otp);

    let lead = await Lead.findOne({ where: { phone: localPhone } });

    if (lead) {
      // If already registered and has passcode, suggest login instead
      if (lead.is_registered && lead.passcode) {
        return res.status(409).json({ error: 'User already registered. Please login.', alreadyRegistered: true });
      }

      await lead.update({ 
        name: name || lead.name,
        email: email || lead.email,
        otp: otpHash,
        otp_expiry: expiry,
        browserFingerprint: browserFingerprint || lead.browserFingerprint
      });
    } else {
      lead = await Lead.create({
        name,
        phone: localPhone,
        email,
        source: 'Email Registration',
        otp: otpHash,
        otp_expiry: expiry,
        browserFingerprint,
        verified: false,
        is_registered: false
      });
    }

    // Send Email OTP
    const emailResult = await sendOtpEmail({ email, otp, name });

    await logAuditEvent({
      eventType: 'lead.email_otp.send.success',
      actorType: 'lead',
      actorId: localPhone,
      success: emailResult.sent,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: { email }
    });

    if (!emailResult.sent) {
      // If real email fails, we check if bypass is explicitly enabled as a backup
      const isBypassEnabled = process.env.BYPASS_EMAIL_VERIFICATION === 'true';
      if (isBypassEnabled) {
        // CRITICAL: Update the lead with the bypass OTP so it can actually be verified
        const bypassOtp = '123456';
        await lead.update({
          otp: hashOtp(bypassOtp)
        });

        return res.json({ 
          success: true, 
          message: 'Email delivery delayed. Use test code 123456 to continue.' 
        });
      }

      return res.status(500).json({ 
        error: `Email delivery failed (${emailResult.error}). Please check your settings.` 
      });
    }

    res.json({ success: true, message: 'Verification code sent to your email.' });
  } catch (err) {
    console.error('Register request error:', err);
    await logAuditEvent({
      eventType: 'lead.register_request.failed',
      actorType: 'lead',
      success: false,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: { 
        reason: 'exception', 
        message: err.message,
        stack: err.stack?.slice(0, 500)
      }
    });
    res.status(500).json({ error: err.message });
  }
});

// 2. Verify Registration OTP
router.post('/verify-registration-otp', otpVerifyLimiter, async (req, res) => {
  try {
    const otp = cleanText(req.body?.otp, 10);
    const phone = cleanText(req.body?.phone, 20);

    const normalizedPhone = normalizePhone(phone);
    const localPhone = normalizedPhone.startsWith('91') && normalizedPhone.length === 12
      ? normalizedPhone.slice(2)
      : normalizedPhone;

    if (!localPhone || !/^\d{6}$/.test(String(otp || ''))) {
      return res.status(400).json({ error: 'Invalid phone or OTP format.' });
    }

    const lead = await Lead.findOne({ where: { phone: localPhone } });

    // --- BYPASS LOGIC ---
    const isBypassEnabled = process.env.BYPASS_EMAIL_VERIFICATION === 'true';
    if (isBypassEnabled && otp === '123456') {
      console.log(`[AuthBypass] Manually verifying lead: ${localPhone}`);
      const verificationToken = crypto.randomBytes(24).toString('hex');
      const verificationExpiry = new Date(Date.now() + PASSCODE_SETUP_TTL_MS);
      
      if (lead) {
        await lead.update({
          verified: true,
          otp: hashSetupToken(verificationToken),
          otp_expiry: verificationExpiry
        });
      }
      
      return res.json({
        success: true,
        verification_token: verificationToken,
        message: 'Bypass active: Verification successful.'
      });
    }
    // --- END BYPASS LOGIC ---

    if (!lead || !lead.otp || hashOtp(otp) !== lead.otp) {
      return res.status(400).json({ error: 'Invalid or expired OTP.' });
    }

    if (new Date() > lead.otp_expiry) {
      return res.status(400).json({ error: 'OTP has expired.' });
    }

    const verificationToken = crypto.randomBytes(24).toString('hex');
    const verificationExpiry = new Date(Date.now() + PASSCODE_SETUP_TTL_MS);

    // Replace the OTP with a short-lived setup token. The frontend must
    // present this token when creating the passcode, which prevents
    // unauthenticated passcode resets on any verified lead.
    await lead.update({
      verified: true,
      otp: hashSetupToken(verificationToken),
      otp_expiry: verificationExpiry
    });

    res.json({
      success: true,
      verification_token: verificationToken,
      message: 'Email verified. Please set your 6-digit passcode.'
    });
  } catch (err) {
    console.error('Verify registration OTP error:', err);
    await logAuditEvent({
      eventType: 'lead.verify_registration_otp.failed',
      actorType: 'lead',
      success: false,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: { reason: 'exception', message: err.message }
    });
    res.status(500).json({ error: err.message });
  }
});

// 3. Setup Passcode
router.post('/setup-passcode', async (req, res) => {
  try {
    const phone = cleanText(req.body?.phone, 20);
    const passcode = cleanText(req.body?.passcode, 6);
    const verificationToken = cleanText(req.body?.verificationToken, 80);

    const normalizedPhone = normalizePhone(phone);
    const localPhone = normalizedPhone.startsWith('91') && normalizedPhone.length === 12
      ? normalizedPhone.slice(2)
      : normalizedPhone;

    if (!localPhone || !/^\d{6}$/.test(passcode) || !verificationToken) {
      return res.status(400).json({ error: 'Verification token and 6-digit passcode are required.' });
    }

    const lead = await Lead.findOne({ where: { phone: localPhone, verified: true } });
    if (!lead) {
      return res.status(403).json({ error: 'Verification required before setting passcode.' });
    }

    if (lead.is_registered && lead.passcode) {
      return res.status(409).json({ error: 'User already registered. Please login.' });
    }

    if (!lead.otp || hashSetupToken(verificationToken) !== lead.otp) {
      return res.status(403).json({ error: 'Verification expired. Please request a new OTP.' });
    }

    if (!lead.otp_expiry || new Date() > lead.otp_expiry) {
      return res.status(403).json({ error: 'Verification expired. Please request a new OTP.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPasscode = await bcrypt.hash(passcode, salt);
    const leadToken = crypto.randomBytes(16).toString('hex');

    await lead.update({
      passcode: hashedPasscode,
      is_registered: true,
      lead_token: leadToken,
      otp: null,
      otp_expiry: null
    });

    await logAuditEvent({
      eventType: 'lead.passcode.setup',
      actorType: 'lead',
      actorId: localPhone,
      success: true,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ 
      success: true, 
      lead_token: leadToken,
      lead: { name: lead.name, email: lead.email, phone: lead.phone } 
    });
  } catch (err) {
    console.error('Setup passcode error:', err);
    await logAuditEvent({
      eventType: 'lead.setup_passcode.failed',
      actorType: 'lead',
      success: false,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: { reason: 'exception', message: err.message }
    });
    res.status(500).json({ error: err.message });
  }
});

// 4. Login with Passcode
router.post('/login-with-passcode', passcodeLoginLimiter, async (req, res) => {
  try {
    const phone = cleanText(req.body?.phone, 20);
    const passcode = cleanText(req.body?.passcode, 6);
    const browserFingerprint = cleanText(req.body?.browserFingerprint, 120);

    const normalizedPhone = normalizePhone(phone);
    const localPhone = normalizedPhone.startsWith('91') && normalizedPhone.length === 12
      ? normalizedPhone.slice(2)
      : normalizedPhone;

    if (!localPhone || !passcode) {
      return res.status(400).json({ error: 'Phone and passcode are required.' });
    }

    // --- TRIAL CREDENTIAL HANDLING ---
    const TRIAL_PHONE = '1234567890';
    const TRIAL_PASSCODE = '123456';

    if (localPhone === TRIAL_PHONE && passcode === TRIAL_PASSCODE) {
      // Create a unique trial lead per visitor fingerprint to track independent trial limits
      const fingerprintSuffix = browserFingerprint ? `-${browserFingerprint.substring(0, 30)}` : '';
      const trialIdentifier = `${TRIAL_PHONE}${fingerprintSuffix}`;

      let [trialLead] = await Lead.findOrCreate({
        where: { phone: trialIdentifier },
        defaults: {
          name: 'Trial User',
          phone: trialIdentifier,
          email: 'trial@dholera.local',
          is_trial: true,
          verified: true,
          is_registered: true,
          source: 'Trial Account'
        }
      });

      const leadToken = crypto.randomBytes(16).toString('hex');
      await trialLead.update({ 
        lead_token: leadToken,
        visit_count: trialLead.visit_count + 1,
        returning_visitor: true
      });

      await logAuditEvent({
        eventType: 'lead.trial_login.success',
        actorType: 'lead',
        actorId: trialIdentifier,
        success: true,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });

      return res.json({ 
        success: true, 
        lead_token: leadToken, 
        lead: { name: 'Trial User', email: trialLead.email, phone: TRIAL_PHONE } 
      });
    }
    // --- END TRIAL CREDENTIAL HANDLING ---

    const lead = await Lead.findOne({ where: { phone: localPhone, is_registered: true } });
    if (!lead || !lead.passcode) {
      return res.status(401).json({ error: 'Invalid credentials or user not registered.' });
    }

    const isMatch = await bcrypt.compare(passcode, lead.passcode);
    if (!isMatch) {
      await logAuditEvent({
        eventType: 'lead.login.failed',
        actorType: 'lead',
        actorId: localPhone,
        success: false,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      });
      return res.status(401).json({ error: 'Invalid passcode.' });
    }

    const leadToken = crypto.randomBytes(16).toString('hex');
    await lead.update({ 
      lead_token: leadToken,
      visit_count: lead.visit_count + 1,
      returning_visitor: true
    });

    await logAuditEvent({
      eventType: 'lead.login.success',
      actorType: 'lead',
      actorId: localPhone,
      success: true,
      ip: req.ip,
      userAgent: req.headers['user-agent']
    });

    res.json({ 
      success: true, 
      lead_token: leadToken, 
      lead: { name: lead.name, email: lead.email, phone: lead.phone } 
    });
  } catch (err) {
    console.error('Login with passcode error:', err);
    await logAuditEvent({
      eventType: 'lead.login_with_passcode.failed',
      actorType: 'lead',
      success: false,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: { reason: 'exception', message: err.message }
    });
    res.status(500).json({ error: err.message });
  }
});

// POST import leads from Excel (Admin)
router.post('/import', verifyToken, memoryUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer);
    const worksheet = workbook.getWorksheet(1); // Get first worksheet
    
    const leadsToCreate = [];
    const summary = { total: 0, created: 0, updated: 0, failed: 0 };

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return; // Skip header

      const name = cleanText(row.getCell(1).value, 120);
      const phone = cleanText(row.getCell(2).value, 20);
      const email = cleanEmail(row.getCell(3).value);
      const status = cleanText(row.getCell(4).value, 40);

      const normalizedPhone = normalizePhone(phone);
      const localPhone = normalizedPhone.startsWith('91') && normalizedPhone.length === 12
        ? normalizedPhone.slice(2)
        : normalizedPhone;

      if (name && isValidPhone(localPhone)) {
        leadsToCreate.push({
          name,
          phone: localPhone,
          email,
          status: ALLOWED_LEAD_STATUSES.has(status) ? status : 'New',
          source: 'Import'
        });
        summary.total++;
      } else {
        summary.failed++;
      }
    });

    for (const leadData of leadsToCreate) {
      const [lead, created] = await Lead.findOrCreate({
        where: { phone: leadData.phone },
        defaults: leadData
      });

      if (!created) {
        await lead.update(leadData);
        summary.updated++;
      } else {
        summary.created++;
      }
    }

    await logAuditEvent({
      eventType: 'leads.imported',
      actorType: 'admin',
      actorId: req.user?.username || 'admin',
      success: true,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: summary
    });

    res.json({ success: true, summary });
  } catch (err) {
    console.error('Import error:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT mark lead as read
router.put('/:id/read', verifyToken, async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    
    await lead.update({ isRead: true });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET full system backup (JSON)
router.get('/system/backup', verifyToken, async (req, res) => {
  try {
    const data = {
      leads: await Lead.findAll(),
      updates: await Update.findAll(),
      sessions: await UserSession.findAll(),
      pdfs: await PdfDocument.findAll(),
      settings: await Setting.findAll(),
      auditLogs: await AuditLog.findAll()
    };
    
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', 'attachment; filename=' + 'dholera_full_backup.json');
    res.send(JSON.stringify(data, null, 2));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST restore from backup
router.post('/system/restore', verifyToken, memoryUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    
    const data = JSON.parse(req.file.buffer.toString());
    
    const results = {
      leads: { created: 0, updated: 0 },
      updates: { created: 0, updated: 0 },
      sessions: { created: 0 },
      pdfs: { created: 0, updated: 0 }
    };

    // Restore Leads (Deduplicate by phone)
    if (data.leads) {
      for (const item of data.leads) {
        const [obj, created] = await Lead.findOrCreate({
          where: { phone: item.phone },
          defaults: item
        });
        if (!created) {
          await obj.update(item);
          results.leads.updated++;
        } else {
          results.leads.created++;
        }
      }
    }

    // Restore Updates (Deduplicate by title)
    if (data.updates) {
      for (const item of data.updates) {
        const [obj, created] = await Update.findOrCreate({
          where: { title: item.title },
          defaults: item
        });
        if (!created) {
          await obj.update(item);
          results.updates.updated++;
        } else {
          results.updates.created++;
        }
      }
    }

    // Restore PDFs (Deduplicate by title)
    if (data.pdfs) {
      for (const item of data.pdfs) {
        const [obj, created] = await PdfDocument.findOrCreate({
          where: { title: item.title },
          defaults: item
        });
        if (!created) {
          await obj.update(item);
          results.pdfs.updated++;
        } else {
          results.pdfs.created++;
        }
      }
    }

    // Restore Sessions (Add all)
    if (data.sessions) {
      for (const item of data.sessions) {
        await UserSession.create(item);
        results.sessions.created++;
      }
    }

    await logAuditEvent({
      eventType: 'system.restore',
      actorType: 'admin',
      actorId: req.user?.username || 'admin',
      success: true,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: results
    });

    res.json({ success: true, results });
  } catch (err) {
    console.error('Restore error:', err);
    res.status(500).json({ error: err.message });
  }
});

// NOTE: Test-only endpoint for QA/third-party testers (staging only)
// Usage: enable TEST_LOGIN_ALLOWED=true in env (or run when NODE_ENV !== 'production')
// Creates or updates a lead and returns a lead_token for passcode-less testing.
router.post('/test-login', async (req, res) => {
  try {
    const allow = process.env.TEST_LOGIN_ALLOWED === 'true' || process.env.NODE_ENV !== 'production';
    if (!allow) return res.status(403).json({ error: 'Test login disabled.' });

    const name = cleanText(req.body?.name || process.env.TEST_USER_NAME || 'QA Tester', 120);
    const email = cleanEmail(req.body?.email || process.env.TEST_USER_EMAIL || 'qa@test.local');
    const phoneRaw = cleanText(req.body?.phone || process.env.TEST_USER_PHONE || '9876543210', 20);
    const passcodePlain = req.body?.passcode || process.env.TEST_USER_PASSCODE || '123456';

    const normalizedPhone = normalizePhone(phoneRaw);
    const localPhone = normalizedPhone.startsWith('91') && normalizedPhone.length === 12
      ? normalizedPhone.slice(2)
      : normalizedPhone;

    if (!localPhone || !/^[0-9]{10,}$/.test(localPhone)) {
      return res.status(400).json({ error: 'Invalid phone provided.' });
    }

    let lead = await Lead.findOne({ where: { phone: localPhone } });

    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash(passcodePlain, salt);
    const leadToken = crypto.randomBytes(16).toString('hex');

    if (lead) {
      await lead.update({
        name,
        email,
        verified: true,
        is_registered: true,
        passcode: hashedPass,
        lead_token: leadToken
      });
    } else {
      lead = await Lead.create({
        name,
        phone: localPhone,
        email,
        verified: true,
        is_registered: true,
        passcode: hashedPass,
        lead_token: leadToken
      });
    }

    const { logAuditEvent } = require('../services/auditLogger');
    await logAuditEvent({
      eventType: 'lead.test_login.created',
      actorType: 'system',
      actorId: 'test-login',
      success: true,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: { phone: localPhone }
    });

    res.json({ success: true, lead_token: leadToken, lead: { name: lead.name, email: lead.email, phone: lead.phone } });
  } catch (err) {
    console.error('Test-login error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
