const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

const isGmail = (SMTP_HOST.includes('gmail.com') || SMTP_HOST.includes('googlemail.com'));

// Use explicit configuration for better control on restricted networks like Railway
const transporterConfig = {
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465, // Use SSL for port 465
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
  tls: {
    // Essential for modern SMTP connections
    rejectUnauthorized: false
  },
  // Force IPv4 for stability in cloud environments
  family: 4 
};

const transporter = nodemailer.createTransport({
  ...transporterConfig,
  pool: process.env.SMTP_POOL === 'true', // Disable pooling by default on Railway
  connectionTimeout: 15000,
  greetingTimeout: 15000,
  socketTimeout: 15000,
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

  const subject = 'Your Verification Code - Dholera Platform';
  const text = `Hello ${name},\n\nYour verification code is: ${otp}\n\nThis code will expire in 5 minutes.\n\nThank you,\nDholera Team`;
  const html = `
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
  `;

  // Fallback to Resend HTTP API if SMTP is blocked (Common on Railway)
  if (SMTP_HOST.includes('resend.com')) {
    try {
      console.log('[EmailService] Using Resend HTTP API for %s', email);
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SMTP_PASS}`
        },
        body: JSON.stringify({
          from: SMTP_FROM || 'onboarding@resend.dev',
          to: [email],
          subject,
          html
        })
      });

      const data = await response.json();
      if (response.ok) {
        console.log('[EmailService] OTP sent successfully via Resend API');
        return { sent: true, messageId: data.id };
      } else {
        // Special handling for Resend "onboarding" restriction
        if (data.message && data.message.includes('testing emails')) {
          console.warn('[EmailService] RESEND RESTRICTION: You must verify your domain to send to others. Using bypass.');
        }
        throw new Error(data.message || 'Resend API Error');
      }
    } catch (apiError) {
      console.error('[EmailService] Resend API Error:', apiError.message);
      // Fall through to SMTP as a backup (though likely to fail)
    }
  }

  try {
    const mailOptions = {
      from: `"Dholera Growth Evidence" <${SMTP_FROM}>`,
      to: email,
      subject,
      text,
      html,
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
