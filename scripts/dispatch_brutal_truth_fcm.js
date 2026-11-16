const { sendInvestorNotification } = require('../services/notificationService');

async function main() {
  const res = await sendInvestorNotification(
    '🚨 The Brutal Truth About Dholera SIR 2026',
    'Unfiltered ground reality, broker hype vs facts, TP1 and TP2 readiness, and how to avoid land fraud.',
    {
      type: 'insight',
      id: '247',
      slug: 'the-brutal-truth-about-dholera-sir-2026-ground-reality-risks',
      title: 'The Brutal Truth About Dholera SIR 2026',
      imageUrl: 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1794806547/dholera/images/dholera-expressway-land-2026-corridor-cover-nov16.jpg'
    }
  );
  console.log('[FCM Success]', JSON.stringify(res, null, 2));
}

main().catch(console.error);
