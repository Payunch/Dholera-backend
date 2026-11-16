const { sendInvestorNotification } = require('../services/notificationService');

async function main() {
  const res1 = await sendInvestorNotification(
    '⚠️ Dholera Land Scam Playbook: 5 Traps Exposed',
    'Unapproved agricultural land, fake TP schemes, AnyRoR title defects, and 5 mandatory legal safeguards.',
    {
      type: 'insight',
      id: '248',
      slug: 'dholera-land-scam-playbook-5-unapproved-agricultural-traps-defense',
      title: 'Dholera Land Scam Playbook: 5 Unapproved Agricultural Traps',
      imageUrl: 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1793904268/dholera/images/dholera-plot-registry-2026-office-cover-nov06.jpg'
    }
  );
  console.log('[FCM Success 1]', JSON.stringify(res1));

  const res2 = await sendInvestorNotification(
    '🔍 Why 80% of Dholera Land Is Not Ready (2026 Reality)',
    'TP1 & TP2 Activation Area readiness vs undeveloped outer TP3-TP6. The honest zoning breakdown.',
    {
      type: 'insight',
      id: '249',
      slug: 'why-80-percent-of-dholera-land-is-not-ready-tp1-tp2-reality',
      title: 'Why 80% of Dholera Land Is Not Ready',
      imageUrl: 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1794663048/dholera/images/dholera-labh-pacham-land-2026-sunrise-cover-nov14.jpg'
    }
  );
  console.log('[FCM Success 2]', JSON.stringify(res2));
}

main().catch(console.error);
