let Resend = null;

try {
  ({ Resend } = require('resend'));
} catch (_) {
  // This keeps the server bootable until dependencies are installed.
}

const OTP_SENDER = 'Dholera Platform <otp@dholeraplatform.com>';

function escapeHtml(value) {
  return String(value || '').replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[character]));
}

/**
 * Sends a password-reset or account-verification code through Resend.
 * The caller is responsible for generating, hashing, expiring, and limiting
 * OTP attempts. This service never logs the OTP or the Resend API key.
 */
async function sendOtpEmail(toEmail, name, otpCode) {
  const apiKey = process.env.RESEND_API_KEY;
  const normalizedEmail = String(toEmail || '').trim().toLowerCase();
  const normalizedName = String(name || '').trim() || 'there';
  const normalizedCode = String(otpCode || '').trim();

  if (!apiKey) {
    return { success: false, error: 'RESEND_API_KEY is not configured.' };
  }

  if (!Resend) {
    return { success: false, error: 'The resend package is not installed.' };
  }

  if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
    return { success: false, error: 'A valid recipient email is required.' };
  }

  if (!/^\d{6}$/.test(normalizedCode)) {
    return { success: false, error: 'OTP code must contain exactly six digits.' };
  }

  const safeName = escapeHtml(normalizedName);
  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: OTP_SENDER,
      to: [normalizedEmail],
      subject: 'Your Verification Code - Dholera Platform',
      text: `VERIFICATION CODE\n\nHello ${normalizedName},\n\nYour verification code for the Dholera Platform is:\n\n${normalizedCode}\n\nThis code will expire in 5 minutes.\n\nIf you did not request this code, please ignore this email.\n\n© 2026 Dholera Growth Evidence Platform. All rights reserved.`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;border:1px solid #eee;border-radius:10px;">
          <h2 style="color:#1a237e;text-align:center;">Verification Code</h2>
          <p>Hello <strong>${safeName}</strong>,</p>
          <p>Your verification code for the Dholera Platform is:</p>
          <div style="background:#f5f5f5;padding:20px;text-align:center;font-size:32px;font-weight:bold;letter-spacing:5px;color:#d32f2f;margin:20px 0;">${normalizedCode}</div>
          <p>This code will expire in <strong>5 minutes</strong>.</p>
          <p>If you did not request this code, please ignore this email.</p>
          <hr style="border:0;border-top:1px solid #eee;margin:20px 0;" />
          <p style="font-size:12px;color:#666;text-align:center;">&copy; 2026 Dholera Growth Evidence Platform. All rights reserved.</p>
        </div>`
    });

    if (error) {
      console.error('[OTP email] Resend rejected email:', error.message || error);
      return { success: false, error: error.message || 'Resend rejected the email.' };
    }

    return { success: true, id: data?.id || null };
  } catch (error) {
    console.error('[OTP email] Failed to send:', error.message || error);
    return { success: false, error: 'Unable to send verification email.' };
  }
}

module.exports = { sendOtpEmail };
