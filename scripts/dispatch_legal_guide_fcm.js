const { sendInvestorNotification } = require('../services/notificationService');

async function main() {
  const res = await sendInvestorNotification(
    '⚖️ Verify Collector NA & 7/12 Land Title in Dholera SIR',
    'Complete 7-step buyer legal due diligence checklist, AnyRoR checks, TP allotment Form F/G search, and title search guide.',
    {
      type: 'insight',
      id: '246',
      slug: 'how-to-verify-collector-na-7-12-land-title-dholera-sir-checklist',
      title: 'How to Verify Collector NA & 7/12 Land Title in Dholera SIR',
      imageUrl: 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1793904268/dholera/images/dholera-plot-registry-2026-office-cover-nov06.jpg'
    }
  );
  console.log('[FCM Success]', JSON.stringify(res, null, 2));
}

main().catch(console.error);
