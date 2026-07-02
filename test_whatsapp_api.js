require('dotenv').config();
const { sendTemplateMessage } = require('./services/whatsapp');

// Replace this with the phone number you just verified in your Meta Dashboard
// Format: Include country code but no plus sign or spaces. Example for India: 919876543210
const TEST_RECIPIENT_PHONE = "917096571613";

async function runTest() {
  console.log('Testing WhatsApp Meta API Connection...');
  console.log('Using Phone Number ID:', process.env.WHATSAPP_PHONE_NUMBER_ID);

  if (!process.env.WHATSAPP_ACCESS_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN.includes('your_permanent_access_token')) {
    console.error('❌ Error: WHATSAPP_ACCESS_TOKEN is not correctly set in .env');
    process.exit(1);
  }

  console.log('--- Testing otp_verification ---');
  try {
    const otpResponse = await sendTemplateMessage({
      phone: TEST_RECIPIENT_PHONE,
      templateName: 'otp_verification',
      languageCode: 'en',
      parameters: ['123456']
    });
    console.log('OTP Result:', otpResponse);
  } catch (err) {
    console.error('OTP Test Failed:', err);
  }

  const result = await sendTemplateMessage({
    phone: TEST_RECIPIENT_PHONE,
    templateName: 'followup_en', 
    languageCode: 'en_US',
    parameters: ['John Doe']
  });

  if (result.sent) {
    console.log('✅ Success! Message sent.');
    console.log('Message ID:', result.messageId);
    console.log('Check your WhatsApp!');
  } else {
    console.error('❌ Failed to send message.');
    console.error('Error Details:', result.error);
  }
}

runTest();
