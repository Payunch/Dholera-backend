const { sendInvestorNotification } = require('../services/notificationService');

async function main() {
  const res = await sendInvestorNotification(
    '📢 Dholera News (17-20 Nov 2026): Tata Fab & Expressway Ground Updates',
    'Tata cleanroom superstructure completed, Expressway trial logistics dates confirmed & Collector NA price brackets.',
    {
      type: 'insight',
      id: '253',
      slug: 'dholera-news-november-2026-land-prices-tata-fab-expressway-guide',
      title: 'Dholera News November 2026: Land Prices, Expressway & Tata Fab',
      imageUrl: 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1795112030/dholera/images/dholera-news-nov2026-tata-fab-tp2-cover.jpg'
    }
  );
  console.log('[FCM Dispatch Success]', JSON.stringify(res));
}

main().catch(console.error);
