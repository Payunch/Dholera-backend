const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

const isGmail = (SMTP_HOST.includes('gmail.com') || SMTP_HOST.includes('googlemail.com')) && 
                (!process.env.SMTP_PORT || SMTP_PORT === 587 || SMTP_PORT === 465);

const transporterConfig = isGmail 
  ? {
      service: 'gmail',
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      // Force IPv4 for stability in cloud environments
      family: 4 
    }
  : {
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_PORT === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },
      tls: {
        // Essential for modern SMTP connections; avoid SSLv3
        rejectUnauthorized: false
      }
    };

const transporter = nodemailer.createTransport({
  ...transporterConfig,
  pool: process.env.SMTP_POOL === 'true' || (isGmail && !process.env.SMTP_POOL), // Default pool true for Gmail
  connectionTimeout: 15000, // Reduced from 45s for faster bypass
  greetingTimeout: 15000,   // Reduced from 45s
  socketTimeout: 15000,     // Reduced from 45s
});

// Diagnostic log
console.log(`[EmailService] SMTP Initialized. Provider: ${isGmail ? 'Gmail' : SMTP_HOST}, User: ${SMTP_USER || 'MISSING'}`);

/**
 * Send OTP Email to Lead
 * @param {Object} params
 * @param {string} params.email - Recipient email
 * @param {string} params.otp - 6-digit OTP
 * @param {string} params.name - Lead name
 */
async function sendOtpEmail({ email, otp, name }) {
  // Always log the OTP to the console so it's findable in Railway logs
  console.log(`[EmailService] >>> Verification code for ${email} is: ${otp} <<<`);

  if (!SMTP_USER || !SMTP_PASS) {
    return { sent: false, error: 'SMTP credentials (USER/PASS) are missing.' };
  }

  try {
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

    const info = await transporter.sendMail(mailOptions);
    console.log('[EmailService] OTP sent successfully to %s', email);
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EmailService] SMTP Error:', {
      message: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
      stack: error.stack
    });
    return { sent: false, error: error.message };
  }
}

module.exports = {
  sendOtpEmail,
};
