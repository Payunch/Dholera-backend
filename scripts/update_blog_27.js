const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

const dbPaths = ['/data/database.sqlite', path.join(__dirname, '../data/database.sqlite')].filter(fs.existsSync);

const oldImg = 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1791864285/dholera/images/dholera-activation-area-utility-plots-2026.jpg';
const newImg = '/images/dholera-smart-utility-duct-engineering-section.svg';

const midCta = `
<!-- Contextual Mid-Article CTA: TP1 vs TP2 Plot Rates -->
<div class="my-10 p-6 sm:p-8 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white border border-slate-800 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 not-prose">
  <div class="space-y-2 text-center md:text-left">
    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-600/20 text-orange-400 border border-orange-500/30 text-[10px] font-black uppercase tracking-wider">
      <span class="w-2 h-2 rounded-full bg-orange-500"></span>
      Investor Intelligence • Ready Possession Plots
    </div>
    <h3 class="text-xl sm:text-2xl font-black uppercase tracking-tight text-white m-0">Compare TP1 vs TP2 Plug-and-Play Plot Rates</h3>
    <p class="text-xs sm:text-sm text-slate-300 max-w-xl m-0 leading-relaxed">
      Request the verified 2026 per-sq-yard valuation index, duct connectivity verification, and approved NA/NOC inventory delivered directly to you.
    </p>
  </div>
  <div class="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
    <a href="/contact?intent=rate-sheet" class="px-6 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-black uppercase tracking-wider text-center shadow-lg shadow-orange-600/30 transition-all">
      Request Rate Sheet
    </a>
    <a href="https://wa.me/917435808031?text=Hi%20Naresh,%20I%20am%20reading%20about%20Dholera%20utility%20ducts%20and%20would%20like%20to%20compare%20TP1%20vs%20TP2%20plot%20rates." target="_blank" rel="noopener noreferrer" class="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black uppercase tracking-wider text-center transition-all">
      WhatsApp Instant
    </a>
  </div>
</div>
`;

async function run() {
  for (const dbPath of dbPaths) {
    const sequelize = new Sequelize({ dialect: 'sqlite', storage: dbPath, logging: false });
    const [rows] = await sequelize.query('SELECT id, content FROM Updates WHERE id = 27');
    if (!rows.length) {
      console.log('No blog 27 in', dbPath);
      continue;
    }
    
    let content = rows[0].content;
    
    // 1. Replace Figure 1
    content = content.replace(oldImg, newImg);
    content = content.replace(
      'Figure 1: Cross-sectional installation of Dholera Smart Utility Ducts showing dedicated subterranean conduits for water, power, gas, and fiber-optic telemetry alongside smart sector avenues.',
      'Figure 1: DICDL Engineering CAD Section: Typical multi-services subterranean corridor in Dholera SIR showing isolated chambers for 66kV/11kV power, fiber SCADA, DI potable water, and tertiary recycled pipelines connecting to plot boundaries.'
    );

    // 2. Insert Mid-Article CTA after Section 2 (after the ul ending section 2 and before Figure 2)
    const sec2Marker = 'pays exclusively for exact consumption, monitored in real time by the City Command Center.</li>\n</ul>';
    const sec2MarkerAlt = 'pays exclusively for exact consumption, monitored in real time by the City Command Center.</li></ul>';
    
    if (content.includes('Compare TP1 vs TP2 Plug-and-Play Plot Rates')) {
      console.log('CTA already present in', dbPath);
    } else if (content.includes(sec2Marker)) {
      content = content.replace(sec2Marker, sec2Marker + '\n' + midCta);
      console.log('Inserted mid-CTA with sec2Marker in', dbPath);
    } else if (content.includes(sec2MarkerAlt)) {
      content = content.replace(sec2MarkerAlt, sec2MarkerAlt + '\n' + midCta);
      console.log('Inserted mid-CTA with sec2MarkerAlt in', dbPath);
    } else {
      // Find where Figure 2 starts
      const fig2Idx = content.indexOf('<figure class="my-8">\n  <img src="https://res.cloudinary.com/dhf36t4vw/image/upload/v1791864284/dholera/images/dholera-activation-area-abcd-building-2026.jpg"');
      if (fig2Idx !== -1) {
        content = content.slice(0, fig2Idx) + midCta + '\n' + content.slice(fig2Idx);
        console.log('Inserted mid-CTA before Figure 2 in', dbPath);
      }
    }

    await sequelize.query('UPDATE Updates SET content = :content WHERE id = 27', {
      replacements: { content }
    });
    console.log('Successfully updated blog 27 in database:', dbPath);
  }
}

run().catch(console.error);
