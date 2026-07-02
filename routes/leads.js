const express = require('express');
const router = express.Router();
const { Lead, PdfView, PdfDocument, Update, Setting } = require('../models');
const { Op } = require('sequelize');
const ExcelJS = require('exceljs');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const { verifyToken } = require('./auth');
const { 
  normalizePhone, 
  buildManualWhatsAppMessage, 
  logWhatsAppActivity 
} = require('../services/whatsapp');
const { logAuditEvent } = require('../services/auditLogger');
const { maybeNotifyHighInterestLead, isHighInterestLead, maybeSendWelcomeMessage } = require('../services/leadNotifications');
const LeadIntelligenceService = require('../services/leadIntelligence');
const { cleanText, cleanEmail, cleanPathFragment, parsePositiveInt } = require('../utils/sanitize');
const multer = require('multer');
const memoryUpload = multer({ storage: multer.memoryStorage() });

// Rate Limiters
const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: { error: 'Too many OTP requests from this IP, please try again after 15 minutes' },
  standardHeaders: true,
  legacyHeaders: false,
});

const formLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15, // Limit each IP to 15 requests per windowMs
  message: { error: 'Too many form submissions from this IP, please try again after an hour' },
  standardHeaders: true,
  legacyHeaders: false,
});


const isValidPhone = (phone) => {
  if (!phone) return false;
  const digits = String(phone).replace(/\D/g, '');
  // Extract last 10 digits if it includes country code
  const last10 = digits.length >= 10 ? digits.slice(-10) : digits;
  return /^[6-9]\d{9}$/.test(last10);
};
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
  const VisitorSession = require('../models').VisitorSession;
  const sessions = plainLead.browserFingerprint && VisitorSession
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

  if (leadData.high_interest_whatsapp_notified_at) {
    return { notified: false, reason: 'already_notified' };
  }

  const result = await maybeNotifyHighInterestLead(mergedLeadData, notificationContext);
  const updates = {};
  if (result.whatsapp?.sent && !leadData.high_interest_whatsapp_notified_at) {
    updates.high_interest_whatsapp_notified_at = new Date();
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
    const limit = parsePositiveInt(req.query?.limit, 50, 100);
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
        { phone: { [Op.like]: `%${search}%` } }
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

    const VisitorSession = require('../models').VisitorSession;
    // Manually attach VisitorSession data for each lead based on fingerprint
    const leadsWithIntelligence = await Promise.all(leads.map(async (lead) => {
      const plainLead = lead.get({ plain: true });
      const leadPages = safeJsonParse(plainLead.visited_pages, []);

      if (plainLead.browserFingerprint && VisitorSession) {
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
        plainLead.visitedPages = [...new Set([...leadPages, ...sessionPages])];
      } else {
        plainLead.sessions = [];
        plainLead.total_sessions = 0;
        plainLead.totalTimeSpent = plainLead.timeSpent || 0;
        plainLead.visitedPages = leadPages;
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
      return res.json({ verified: true, lead_token: lead.lead_token, lead: { name: lead.name, phone: lead.phone } });
    }
    
    res.json({ verified: false });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/leads/onboard
 * Required: name, phone
 * No OTP verification. Just stores the lead and returns a token.
 */
const onboardRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 onboards per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many onboarding attempts from this IP, please try again later.' }
});

router.post('/onboard', onboardRateLimiter, async (req, res) => {
  try {
    const name = cleanText(req.body?.name, 120) || 'Verified Visitor';
    const phone = cleanText(req.body?.phone, 20);
    const browserFingerprint = cleanText(req.body?.browserFingerprint, 120);
    const sessionId = cleanText(req.body?.sessionId, 100);
    const preferred_language = cleanText(req.body?.preferred_language, 5) || 'en';

    if (!phone) {
      return res.status(400).json({ error: 'Phone Number is required' });
    }

    const normalizedPhone = normalizePhone(phone);
    const localPhone = normalizedPhone.startsWith('91') && normalizedPhone.length === 12
      ? normalizedPhone.slice(2)
      : normalizedPhone;

    if (!isValidPhone(localPhone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Find or create lead
    let lead = await Lead.findOne({ where: { phone: localPhone } });
    
    if (lead) {
      // Update existing lead name if provided
      await lead.update({ 
        name: name || lead.name, 
        browserFingerprint: browserFingerprint || lead.browserFingerprint,
        verified: true,
        preferred_language: preferred_language || lead.preferred_language
      });
    } else {
      const leadToken = `LT_${crypto.randomBytes(16).toString('hex')}`;
      lead = await Lead.create({
        name,
        phone: localPhone,
        lead_token: leadToken,
        browserFingerprint,
        verified: true,
        source: 'Quick Onboard',
        preferred_language
      });
    }

    // AI Intelligence Update
    await LeadIntelligenceService.updateLeadIntelligence(lead);

    await logAuditEvent({
      eventType: 'lead.onboard.success',
      actorType: 'lead',
      actorId: localPhone,
      success: true,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: { leadId: lead.id }
    });

    const { sendAdminNotification } = require('../services/notificationService');
    await sendAdminNotification(
      'New User Onboarded',
      `${lead.name} (${lead.phone}) joined the platform.`,
      { 
        type: 'lead_onboard', 
        lead_id: lead.id.toString(),
        name: lead.name,
        phone: lead.phone,
        source: lead.source || 'Website',
        createdAt: lead.createdAt.toISOString()
      }
    );

    res.json({
      success: true,
      lead_token: lead.lead_token,
      name: lead.name,
      phone: lead.phone
    });
  } catch (err) {
    console.error('Onboard error:', err);
    res.status(500).json({ error: 'Failed to onboard user' });
  }
});

// POST Send WhatsApp OTP
router.post('/send-otp', otpLimiter, async (req, res) => {
  try {
    const phone = cleanText(req.body?.phone, 20);
    if (!phone) return res.status(400).json({ error: 'Phone number is required' });

    const normalizedPhone = normalizePhone(phone);
    const localPhone = normalizedPhone.startsWith('91') && normalizedPhone.length === 12
      ? normalizedPhone.slice(2)
      : normalizedPhone;

    if (!isValidPhone(localPhone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Save to DB
    const { OtpVerification } = require('../models');
    await OtpVerification.create({
      phone: localPhone,
      code: otpCode,
      expires_at: expiresAt
    });

    // Send via WhatsApp Meta API
    const { sendTemplateMessage } = require('../services/whatsapp');
    
    // TEMPORARY HACK: Using the approved 'welcome_en' template to send the OTP code 
    // because the 'otp_verification' template is blocked by Meta business verification.
    const templateName = 'welcome_en'; 
    
    // Magic bypass for test number
    if (localPhone === '15556483583') {
      return res.json({ success: true, message: 'OTP sent (Bypass)' });
    }

    const result = await sendTemplateMessage({
      phone: normalizedPhone,
      templateName,
      languageCode: 'en',
      parameters: [otpCode] // The OTP code (e.g. 123456) will replace {{1}} in the welcome message
    });

    if (!result.sent) {
      console.error('WhatsApp OTP failed to send:', result.error);
      return res.status(500).json({ error: 'Failed to send OTP message. Ensure your WhatsApp templates are approved.' });
    }

    res.json({ success: true, message: 'OTP sent successfully' });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: 'Internal server error while sending OTP' });
  }
});

// POST Verify OTP (Public)
router.post('/verify-otp', otpLimiter, async (req, res) => {
  try {
    const name = cleanText(req.body?.name, 120) || 'Verified Visitor';
    const phone = cleanText(req.body?.phone, 20);
    const firebaseToken = req.body?.firebaseToken;
    const browserFingerprint = cleanText(req.body?.browserFingerprint, 120);
    const sessionId = cleanText(req.body?.sessionId, 100);
    const preferred_language = cleanText(req.body?.preferred_language, 5) || 'en';
    const utm_source = cleanText(req.body?.utm_source, 80);

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const normalizedPhone = normalizePhone(phone);
    const localPhone = normalizedPhone.startsWith('91') && normalizedPhone.length === 12
      ? normalizedPhone.slice(2)
      : normalizedPhone;

    if (!isValidPhone(localPhone)) {
      return res.status(400).json({ error: 'Invalid phone number format' });
    }

    const otpCode = cleanText(req.body?.otpCode, 6); // Add otpCode to request
    
    // Check if test bypass
    if (localPhone === '15556483583' && otpCode === '123456') {
      // Allow test bypass
    } else {
      if (!otpCode || otpCode.length !== 6) {
        return res.status(400).json({ error: 'A valid 6-digit OTP code is required.' });
      }

      const { OtpVerification } = require('../models');
      const otpRecord = await OtpVerification.findOne({
        where: {
          phone: localPhone,
          code: otpCode,
          verified: false
        },
        order: [['createdAt', 'DESC']]
      });

      if (!otpRecord) {
        return res.status(400).json({ error: 'Invalid or expired OTP.' });
      }

      if (new Date() > otpRecord.expires_at) {
        return res.status(400).json({ error: 'OTP has expired. Please request a new one.' });
      }

      // Mark as verified
      await otpRecord.update({ verified: true });
    }


    // Find or create lead
    let lead = await Lead.findOne({ where: { phone: localPhone } });
    
    if (lead) {
      await lead.update({ 
        name: name || lead.name, 
        browserFingerprint: browserFingerprint || lead.browserFingerprint,
        verified: true,
        preferred_language: preferred_language || lead.preferred_language,
        ...(utm_source && utm_source !== 'organic' && { utm_source })
      });
    } else {
      const leadToken = `LT_${crypto.randomBytes(16).toString('hex')}`;
      let score = 25; // Base score for verified OTP
      if (utm_source && utm_source !== 'organic') score += 10;
      
      lead = await Lead.create({
        name,
        phone: localPhone,
        lead_token: leadToken,
        browserFingerprint,
        verified: true,
        source: 'OTP Onboard',
        preferred_language,
        utm_source: utm_source || 'organic',
        score
      });
    }

    // Set Session access
    if (req.session) {
      req.session.pdfVerified = true;
      req.session.verifiedLeadId = lead.id;
    }

    // AI Intelligence Update
    await LeadIntelligenceService.updateLeadIntelligence(lead);

    await logAuditEvent({
      eventType: 'lead.otp_verify.success',
      actorType: 'lead',
      actorId: localPhone,
      success: true,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: { leadId: lead.id }
    });

    const { sendAdminNotification } = require('../services/notificationService');
    await sendAdminNotification(
      'New Lead Verified via OTP',
      `${lead.name} (${lead.phone}) completed OTP verification and unlocked PDFs.`,
      { 
        type: 'lead_otp_verify', 
        lead_id: lead.id.toString(),
        name: lead.name,
        phone: lead.phone,
        createdAt: lead.createdAt.toISOString()
      }
    );

    // Trigger automated welcome message asynchronously (fire and forget)
    maybeSendWelcomeMessage(lead).catch(err => {
      console.error('Failed to send automated welcome message:', err);
    });

    res.json({
      success: true,
      lead_token: lead.lead_token,
      name: lead.name,
      phone: lead.phone
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Failed to verify OTP' });
  }
});

// POST save lead directly (LEGACY -> Redirect to onboard)
router.post('/save-direct', async (req, res) => {
  req.url = '/onboard';
  return router.handle(req, res);
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

    // AI Intelligence Update
    await LeadIntelligenceService.updateLeadIntelligence(lead);

    const leadContext = await getLeadContext(lead);
    await maybeNotifyHighInterestLead(lead, leadContext);

    // Trigger behavioral follow up if applicable (fire and forget)
    const { maybeSendBehavioralFollowUp } = require('../services/leadNotifications');
    maybeSendBehavioralFollowUp(lead).catch(err => console.error('Failed to send behavioral follow up:', err));

    res.json({ success: true, lead: { name: lead.name, phone: lead.phone } });
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
        phone: lead.phone,
        status: lead.status,
        source: lead.source,
        is_registered: lead.is_registered,
        is_trial: lead.is_trial,
        is_pro: lead.is_pro,
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

    const updates = {};
    if (nextName) updates.name = nextName;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No profile changes provided' });
    }

    await lead.update(updates);

    return res.json({
      success: true,
      lead: {
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        status: lead.status,
        source: lead.source,
        is_registered: lead.is_registered,
        is_pro: lead.is_pro,
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
router.post('/', formLimiter, async (req, res) => {
  try {
    const name = cleanText(req.body?.name, 120);
    const source = cleanText(req.body?.source, 80);
    const utm_source = cleanText(req.body?.utm_source, 80) || 'organic';
    const sessionId = cleanText(req.body?.sessionId, 100);
    const phone = cleanText(req.body?.phone, 20);
    const preferred_language = cleanText(req.body?.preferred_language, 5) || 'en';

    const normalizedPhone = normalizePhone(phone);
    const localPhone = normalizedPhone.startsWith('91') && normalizedPhone.length === 12
      ? normalizedPhone.slice(2)
      : normalizedPhone;

    if (!name || !isValidPhone(localPhone)) {
      return res.status(400).json({ error: 'Valid name and phone are required.' });
    }

    let timeSpent = 0;
    let visitedPages = '[]';
    
    const VisitorSession = require('../models').VisitorSession;
    if (sessionId && VisitorSession) {
      const session = await VisitorSession.findOne({ where: { sessionId } });
      if (session) {
        timeSpent = session.timeSpent;
        visitedPages = session.visitedPages;
      }
    }
    
    let score = 10; // Base score
    if (source && source.toLowerCase().includes('site visit')) score += 50;
    else if (source && source.toLowerCase().includes('contact')) score += 20;
    if (utm_source !== 'organic') score += 10;

    const lead = await Lead.create({
      name,
      phone: localPhone,
      source: source || 'Website',
      utm_source,
      score,
      timeSpent,
      visited_pages: visitedPages,
      preferred_language
    });

    // AI Intelligence Update
    await LeadIntelligenceService.updateLeadIntelligence(lead);
    
    // Automated Welcome Message
    await maybeSendWelcomeMessage(lead);

    const { sendAdminNotification } = require('../services/notificationService');
    await sendAdminNotification(
      'New Lead Registered',
      `${lead.name} has joined the platform via ${lead.source}`,
      { 
        type: 'lead_registration', 
        lead_id: lead.id.toString(),
        name: lead.name,
        phone: lead.phone,
        source: lead.source || 'Website',
        createdAt: lead.createdAt.toISOString()
      }
    );

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
      const status = cleanText(row.getCell(4).value, 40);

      const normalizedPhone = normalizePhone(phone);
      const localPhone = normalizedPhone.startsWith('91') && normalizedPhone.length === 12
        ? normalizedPhone.slice(2)
        : normalizedPhone;

      if (name && isValidPhone(localPhone)) {
        leadsToCreate.push({
          name,
          phone: localPhone,
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
    const { UserSession, AuditLog } = require('../models');
    const data = {
      leads: await Lead.findAll(),
      updates: await Update.findAll(),
      sessions: await (UserSession?.findAll() || Promise.resolve([])),
      pdfs: await PdfDocument.findAll(),
      settings: await Setting.findAll(),
      auditLogs: await (AuditLog?.findAll() || Promise.resolve([]))
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
    
    const root = JSON.parse(req.file.buffer.toString());
    const data = root.data || root;
    
    const results = {
      leads: { created: 0, updated: 0 },
      updates: { created: 0, updated: 0 },
      sessions: { created: 0 },
      pdfs: { created: 0, updated: 0 }
    };

    const leadList = data.Lead || data.leads;
    if (leadList) {
      for (const item of leadList) {
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

    const updateList = data.Update || data.updates;
    if (updateList) {
      for (const item of updateList) {
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

    const pdfList = data.PdfDocument || data.pdfs;
    if (pdfList) {
      for (const item of pdfList) {
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

    const { UserSession } = require('../models');
    const sessionList = data.UserSession || data.sessions;
    if (sessionList && UserSession) {
      for (const item of sessionList) {
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

// DELETE lead (Admin Only)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const lead = await Lead.findByPk(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    
    await lead.destroy();
    
    await logAuditEvent({
      eventType: 'lead.deleted',
      actorType: 'admin',
      actorId: req.user?.username || 'admin',
      success: true,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      details: { leadId: req.params.id, name: lead.name }
    });
    
    res.json({ success: true, message: 'Lead deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
