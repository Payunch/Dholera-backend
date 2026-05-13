const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '465', 10);
const SMTP_USER = process.env.SMTP_USER; // Your Gmail email
const SMTP_PASS = process.env.SMTP_PASS; // Your Gmail App Password
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

// For Gmail, the 'service' shorthand is more reliable in cloud environments like Railway
const transporterConfig = (SMTP_HOST.includes('gmail.com') || SMTP_HOST.includes('googlemail.com')) 
  ? {
      service: 'gmail',
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    }
  : {
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
    };

const transporter = nodemailer.createTransport({
  ...transporterConfig,
  connectionTimeout: 20000, // Increased to 20 seconds
  greetingTimeout: 20000,
  socketTimeout: 30000,
});

// Diagnostic log (runs on module load)
console.log(`[EmailService] Initialized for ${SMTP_USER ? SMTP_USER : 'MISSING USER'}. Using ${transporterConfig.service ? 'Gmail service' : 'SMTP host ' + SMTP_HOST}`);

/**
 * Send OTP Email to Lead
 * @param {Object} params
 * @param {string} params.email - Recipient email
 * @param {string} params.otp - 6-digit OTP
 * @param {string} params.name - Lead name
 */
async function sendOtpEmail({ email, otp, name }) {
  if (!SMTP_USER || !SMTP_PASS) {
    console.warn('[EmailService] SMTP credentials missing. Skipping email.');
    return { sent: false, error: 'SMTP credentials (USER/PASS) are not set in environment.' };
  }

  try {
    console.log(`[EmailService] Attempting to send OTP to ${email}...`);
    const mailOptions = {
    from: `"Dholera Growth Evidence" <${SMTP_FROM}>`,
    to: email,
    subject: 'Your Verification Code - Dholera Platform',
    text: `Hello ${name},\n\nYour verification code is: ${otp}\n\nThis code will expire in 5 minutes.\n\nThank you,\nDholera Team`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #1a237e; text-align: center;">Verification Code</h2>
        <p>Hello <strong>${name}</strong>,</p>
        <p>Your verification code for the Dholera Platform is:</p>
        <div style="background: #f5f5f5; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #d32f2f; margin: 20px 0;">
          ${otp}
        </div>
        <p>This code will expire in <strong>5 minutes</strong>.</p>
        <p>If you did not request this code, please ignore this email.</p>
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="font-size: 12px; color: #666; text-align: center;">
          &copy; ${new Date().getFullYear()} Dholera Growth Evidence Platform. All rights reserved.
        </p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('[EmailService] OTP sent to %s: %s', email, info.messageId);
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EmailService] Error sending email:', error);
    return { sent: false, error: error.message };
  }
}

module.exports = {
  sendOtpEmail,
};
