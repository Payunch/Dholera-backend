let nodemailer = null;
try {
  // Optional dependency: email alerts degrade gracefully when SMTP or the package is unavailable.
  nodemailer = require('nodemailer');
} catch (err) {
  nodemailer = null;
}
const { sendLeadAlertOnWhatsapp, sendWelcomeMessageOnWhatsapp } = require('./whatsapp');

const ADMIN_EMAIL_TO = (process.env.ADMIN_EMAIL_TO || '').split(',').map((value) => value.trim()).filter(Boolean);
const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = Number.parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_SECURE = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true';
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || 'alerts@dholera.local';
const WHATSAPP_ALERT_NUMBERS = (process.env.ADMIN_WHATSAPP_NUMBERS || '').split(',').map((value) => value.trim()).filter(Boolean);
const WHATSAPP_ALERT_TEMPLATE_NAME = process.env.WHATSAPP_LEAD_ALERT_TEMPLATE_NAME || 'lead_alert';
const WHATSAPP_ALERT_LANGUAGE = process.env.WHATSAPP_LEAD_ALERT_LANGUAGE || process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en';

const createMailer = () => {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS
    }
  });
};

const mailer = createMailer();

const isHighInterestLead = (lead = {}) => {
  const visitCount = Number.parseInt(lead.visit_count || lead.visitCount || 0, 10);
  const timeSpent = Number.parseInt(lead.timeSpent || 0, 10);
  const returningVisitor = Boolean(lead.returning_visitor);
  const pdfViews = Number.parseInt(lead.pdf_view_count || lead.pdfViewCount || 0, 10);
  return visitCount >= 3 || timeSpent >= 300 || returningVisitor || pdfViews >= 3;
};

const buildLeadSummary = (lead = {}, context = {}) => {
  const lang = lead.preferred_language || 'en';
  const templates = {
    en: {
      name: 'Name',
      phone: 'Phone',
      score: 'Score (AI Ranked)',
      status: 'Status',
      visits: 'Visits',
      time: 'Time Spent',
      min: 'min',
      lang: 'Preferred Language',
      ai_alert: '🔥 AI ALERT: This is a HOT lead!',
      interests: 'Interests',
      pages: 'Pages',
      none: 'None'
    },
    hi: {
      name: 'नाम',
      phone: 'फ़ोन',
      score: 'स्कोर (AI रैंक)',
      status: 'स्थिति',
      visits: 'विजिट',
      time: 'बिताया गया समय',
      min: 'मिनट',
      lang: 'पसंदीदा भाषा',
      ai_alert: '🔥 AI अलर्ट: यह एक HOT लीड है!',
      interests: 'रुचि',
      pages: 'पेज',
      none: 'कोई नहीं'
    },
    gu: {
      name: 'નામ',
      phone: 'ફોન',
      score: 'સ્કોર (AI રેન્ક)',
      status: 'સ્થિતિ',
      visits: 'વિઝિટ',
      time: 'વિતાવેલો સમય',
      min: 'મિનિટ',
      lang: 'પસંદગીની ભાષા',
      ai_alert: '🔥 AI એલર્ટ: આ એક HOT લીડ છે!',
      interests: 'રુચિ',
      pages: 'પેજ',
      none: 'કોઈ નહીં'
    }
  };

  const t = templates[lang] || templates.en;
  const status = lead.status || 'New';
  const pages = Array.isArray(context.pages) ? context.pages : [];

  const summary = [
    `${t.name}: ${lead.name || 'Unknown'}`,
    `${t.phone}: ${lead.phone || 'Unknown'}`,
    `${t.score}: ${lead.score || 0}`,
    `${t.status}: ${status}`,
    `${t.visits}: ${lead.visit_count || 0}`,
    `${t.time}: ${Math.round((lead.timeSpent || 0) / 60)} ${t.min}`,
    `${t.lang}: ${lang.toUpperCase()}`
  ];

  if (context.isAiHotTrigger) {
    summary.push(`\n${t.ai_alert}`);
    summary.push(`${t.interests}: ${context.topInterests?.join(', ') || t.none}`);
  }

  summary.push(`${t.pages}: ${pages.length ? pages.join(', ') : t.none}`);

  return summary.join('\n');
};

const sendAdminWhatsAppAlert = async (lead, context = {}) => {
  if (!WHATSAPP_ALERT_NUMBERS.length) {
    return { sent: false, reason: 'missing_admin_numbers' };
  }

  const payloadText = `High-interest lead identified:\n${buildLeadSummary(lead, context)}`;
  const results = [];

  for (const phone of WHATSAPP_ALERT_NUMBERS) {
    try {
      const response = await sendLeadAlertOnWhatsapp({ phone, lead });
      results.push({ phone, sent: response.sent, provider: response.provider, messageId: response.messageId });
    } catch (err) {
      results.push({ phone, sent: false, error: err.message });
    }
  }

  return { sent: results.some((item) => item.sent), results };
};

const sendAdminEmailAlert = async (lead, context = {}) => {
  if (!mailer || !ADMIN_EMAIL_TO.length) {
    return { sent: false, reason: 'missing_smtp_or_recipient' };
  }

  const subject = `High-interest lead: ${lead.name || lead.phone || 'new inquiry'}`;
  const text = buildLeadSummary(lead, context);
  const html = text.replace(/\n/g, '<br/>');

  await mailer.sendMail({
    from: SMTP_FROM,
    to: ADMIN_EMAIL_TO.join(', '),
    subject,
    text,
    html
  });

  return { sent: true };
};

const maybeNotifyHighInterestLead = async (lead, context = {}) => {
  if (!lead || !isHighInterestLead(lead)) {
    return { notified: false, reason: 'not_high_interest' };
  }

  const result = { notified: false, whatsapp: null, email: null };

  if (!lead.high_interest_whatsapp_notified_at) {
    try {
      result.whatsapp = await sendAdminWhatsAppAlert(lead, context);
      result.notified = result.whatsapp?.sent || result.notified;
    } catch (err) {
      result.whatsapp = { sent: false, error: err.message };
    }
  }

  if (!lead.high_interest_email_notified_at) {
    try {
      result.email = await sendAdminEmailAlert(lead, context);
      result.notified = result.email?.sent || result.notified;
    } catch (err) {
      result.email = { sent: false, error: err.message };
    }
  }

  return result;
};

const maybeSendWelcomeMessage = async (lead) => {
  if (!lead?.phone) return { sent: false, error: 'no_phone' };

  try {
    const result = await sendWelcomeMessageOnWhatsapp({ lead });
    return result;
  } catch (err) {
    return { sent: false, error: err.message };
  }
};

const maybeSendBehavioralFollowUp = async (lead) => {
  if (!lead?.phone || !lead?.verified) return { sent: false, reason: 'unverified_or_no_phone' };
  
  // Only send if they spent > 5 mins (300 secs) and read a PDF
  if ((lead.timeSpent || 0) < 300) return { sent: false, reason: 'time_too_low' };
  
  let pages = [];
  try {
    pages = JSON.parse(lead.visited_pages || '[]');
  } catch(e) {}
  
  if (!pages.includes('/pdf') && !pages.some(p => p.startsWith('/pdf/'))) {
    return { sent: false, reason: 'no_pdf_viewed' };
  }

  // Prevent multiple follow-ups (if welcome message logic already handles counts, we check whatsapp_sent_count)
  if ((lead.whatsapp_sent_count || 0) > 1) {
    return { sent: false, reason: 'already_followed_up' };
  }

  try {
    const { sendTemplateMessage, logWhatsAppActivity } = require('./whatsapp');
    const lang = lead.preferred_language || 'en';
    const templateName = 'followup_en'; // Fallback to EN if others don't exist

    const result = await sendTemplateMessage({
      phone: lead.phone,
      templateName,
      languageCode: 'en_US',
      parameters: [lead.name || 'Investor']
    });

    if (lead.id) {
      await logWhatsAppActivity({
        leadId: lead.id,
        messageSent: result.sent,
        messageType: 'automated_followup',
        templateName
      });
    }
    return result;
  } catch (err) {
    return { sent: false, error: err.message };
  }
};

module.exports = {
  isHighInterestLead,
  maybeNotifyHighInterestLead,
  maybeSendWelcomeMessage,
  maybeSendBehavioralFollowUp,
  sendAdminWhatsAppAlert,
  sendAdminEmailAlert,
  buildLeadSummary
};