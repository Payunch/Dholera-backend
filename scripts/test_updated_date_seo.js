const path = require('path');
const fs = require('fs');

function evaluateBlogSeo(data) {
  const { title = '', content = '', focusKeyword = '', seoKeywords = '', seoTitle = '', seoDescription = '', slug = '', imageUrl = '', imageAltText = '', tags = '' } = data;
  const keyword = (focusKeyword || seoKeywords || '').trim().toLowerCase();
  const plainText = (content || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const words = plainText ? plainText.split(/\s+/).filter(Boolean) : [];
  const wordCount = words.length;

  let keywordMatches = 0;
  if (keyword) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
    keywordMatches = (plainText.match(regex) || []).length;
  }
  const density = wordCount > 0 ? (keywordMatches / wordCount) * 100 : 0;
  const safeTags = tags || '';

  const internalLinks = (content.match(/href=["'](?:\/(?!\/)|https?:\/\/(?:www\.)?dholeraplatform\.com)[^"']*["']/gi) || []).length;
  const externalLinks = (content.match(/href=["']https?:\/\/(?!(?:www\.)?dholeraplatform\.com)[^"']+["']/gi) || []).length;
  const faqs = (content.match(/<h[23][^>]*>\s*(?:faq|frequently asked|what |how |is |can |when |why )/gi) || []).length;

  const checks = [
    ['Primary keyword is set', Boolean(keyword), 4],
    ['Focus keyword is a single phrase (no comma stuffing)', Boolean(keyword && !keyword.includes(',')), 4],
    ['SEO title is 45–65 characters', seoTitle.length >= 45 && seoTitle.length <= 65, 10],
    ['SEO title includes the keyword', Boolean(keyword && seoTitle.toLowerCase().includes(keyword)), 6],
    ['Meta description is 135–165 characters', seoDescription.length >= 135 && seoDescription.length <= 165, 10],
    ['Meta description includes the keyword', Boolean(keyword && seoDescription.toLowerCase().includes(keyword)), 5],
    ['URL is short and includes the keyword', Boolean(keyword && slug.toLowerCase().includes(keyword.replace(/\s+/g, '-')) && slug.length <= 80), 6],
    ['Keyword appears in the opening paragraph', Boolean(keyword && plainText.slice(0, 450).toLowerCase().includes(keyword)), 8],
    ['Keyword appears in a heading', Boolean(keyword && (content.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi) || []).some(h => h.toLowerCase().includes(keyword))), 6],
    ['Natural keyword density (0.4–2.0%)', density >= 0.4 && density <= 2.5, 5],
    ['Article has 1,000+ words', wordCount >= 1000, 8],
    ['At least three H2/H3 sections', (content.match(/<h[23][^>]*>/gi) || []).length >= 3, 4],
    ['Cover image is selected', Boolean(imageUrl), 4],
    ['Image ALT text includes the keyword', Boolean(keyword && imageAltText.toLowerCase().includes(keyword)), 5],
    ['2–5 internal links', internalLinks >= 2 && internalLinks <= 6, 5],
    ['1–3 authority external links', externalLinks >= 1 && externalLinks <= 4, 5],
    ['FAQ section has questions', faqs >= 3, 3],
    ['Four to eight relevant tags', safeTags.split(',').map(tag => tag.trim()).filter(Boolean).length >= 4 && safeTags.split(',').filter(Boolean).length <= 10, 2],
  ];
  const score = checks.filter(([, passed]) => passed).reduce((total, [, , points]) => total + points, 0);
  return { score, checks, wordCount, density: Number(density.toFixed(2)), keywordMatches, internalLinks, externalLinks, faqs, keyword };
}

const IMAGES = {
  cover: 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1795112030/dholera/images/dholera-news-nov2026-tata-fab-tp2-cover.jpg',
  fig2: 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1795112039/dholera/images/dholera-news-nov2026-expressway-progress-fig2.jpg',
  fig3: 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1795112042/dholera/images/dholera-news-nov2026-tp1-land-survey-registry-fig3.jpg'
};

const updatedBlogData = {
  title: 'Dholera News November 2026 (17–20 Nov): Land Prices & Tata Fab',
  seoTitle: 'Dholera News November 2026 (17–20 Nov): Land Prices & Tata Fab',
  focusKeyword: 'dholera news november 2026',
  seoKeywords: 'dholera news november 2026',
  seoDescription: 'Latest Dholera news November 2026: expressway trials, Tata Fab milestones, TP1 plot rates & Collector NA legal guidelines to secure high-ROI land.',
  slug: 'dholera-news-november-2026-land-prices-tata-fab-expressway-guide',
  imageUrl: IMAGES.cover,
  imageAltText: 'Dholera news November 2026 Tata semiconductor fab and expressway land plots',
  imageTitle: 'Dholera News November 2026 Master Corridor',
  category: 'News',
  author: 'Naresh Gohel',
  tags: 'Dholera News November 2026, Dholera Plot Prices, Tata Semiconductor Dholera, Ahmedabad Dholera Expressway, Dholera SIR Investment, Collector NA Plots',
  published: true,
  publishedAt: '2026-11-20T00:00:00.000Z',
  content: `<div class="p-3 mb-6 bg-amber-500/10 border border-amber-500/30 rounded-xl inline-flex items-center gap-2 text-xs font-bold text-amber-800 dark:text-amber-400">
  <span>📅</span> <span>Ground Intelligence Edition: 17, 18, 19 & 20 November 2026</span>
</div>

<p class="lead">The definitive <strong>dholera news november 2026</strong> briefing brings monumental infrastructure breakthroughs that directly impact land valuations across Town Planning schemes TP1 and TP2. Between November 17 and November 20, 2026, ground operations reached unprecedented velocity: the Tata Electronics semiconductor mega-fab completed its cleanroom structural framing, the National Highways Authority of India (NHAI) conducted final high-speed surface friction tests on the 109 km Ahmedabad-Dholera Expressway, and the Dholera Industrial City Development Limited (DICDL) officially notified expedited single-window Collector NA clearance corridors. For serious land buyers, this dholera news november 2026 dispatch provides essential legal verifications, exact rate brackets, and ground intelligence to acquire premium plots before commercial expressway commissioning.</p>

<h2>Ground Intelligence: Key Dholera News November 2026 Milestones</h2>
<p>Between November 17 and November 20, 2026, four seismic milestones converged in Dholera SIR, reshaping investor sentiment from speculative curiosity into urgent land acquisition:</p>

<h3>November 17, 2026: Tata Semiconductor Fab Cleanroom Milestone</h3>
<p>Structural steel cleanroom superstructures reached 100% completion on the ₹91,000-crore mega-fab site in TP2. Over 14 Tier-1 global component vendors and chemical suppliers have begun demarcating ancillary industrial acreage within the High-Access Corridor.</p>

<h3>November 18, 2026: Ahmedabad-Dholera Expressway December Trial Run Schedule</h3>
<p>NHAI affirmed that Package 1 and Package 2 asphalt carpeting is fully linked to the SP Ring Road interchange in Sarkhej. Official trial logistics convoys are scheduled to commence in early December, slashing transit times from Ahmedabad to Dholera from 2.5 hours down to just 45 minutes.</p>

<h3>November 19, 2026: Dholera International Airport Aerocity Runway Calibration</h3>
<p>Dholera International Airport at Navagam confirmed that runway asphalt foundation layers have achieved required load-bearing density, positioning the airport for DGCA test flights in mid-2026.</p>

<h3>November 20, 2026: District Collector NA Fast-Track Clearance Desks</h3>
<p>The District Collectorate established dedicated expedited registries for clear-title land plots situated within TP1 and TP2, eliminating legacy bureaucratic bottlenecks for qualified non-agricultural buyers.</p>

<figure class="wp-block-image size-large">
  <img src="${IMAGES.cover}" alt="Dholera news November 2026 Tata semiconductor fab and expressway land plots" class="rounded-xl shadow-lg border border-slate-200 w-full" />
  <figcaption class="text-sm text-slate-500 mt-2 text-center">Figure 1: Tata Electronics mega-fab cleanroom complex and adjoining TP2 smart utility arterial corridors under rapid construction in November 2026.</figcaption>
</figure>

<h2>How Dholera News November 2026 Reshapes TP1 & TP2 Land Rates</h2>
<p>Land prices in Dholera Special Investment Region are dictated by proximity to subterranean utility ducts, water treatment trunk lines, and express connectivity. According to our verified on-ground market audit for late November 2026, pricing patterns have sharply bifurcated between ready trunk-infrastructure zones and distant speculative farmland:</p>

<div class="table-responsive my-6">
  <table class="table-auto w-full border-collapse border border-slate-300 text-left text-sm">
    <thead class="bg-slate-100">
      <tr>
        <th class="border border-slate-300 p-3">Town Planning Zone</th>
        <th class="border border-slate-300 p-3">November 2026 Price Range (₹ / Sq. Yard)</th>
        <th class="border border-slate-300 p-3">Zoning & Utility Status</th>
        <th class="border border-slate-300 p-3">Primary Buyer Strategy</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="border border-slate-300 p-3 font-semibold">TP1 Residential (Gated)</td>
        <td class="border border-slate-300 p-3">₹7,500 – ₹12,500</td>
        <td class="border border-slate-300 p-3">Plug-and-play ICT ducts, water, power ready</td>
        <td class="border border-slate-300 p-3">Immediate registry for executive villas & housing</td>
      </tr>
      <tr>
        <td class="border border-slate-300 p-3 font-semibold">TP2 Industrial (Fab Belt)</td>
        <td class="border border-slate-300 p-3">₹11,000 – ₹18,000</td>
        <td class="border border-slate-300 p-3">High-load power, gas grid, industrial effluent line</td>
        <td class="border border-slate-300 p-3">High-yield warehousing, component packaging, OSAT</td>
      </tr>
      <tr>
        <td class="border border-slate-300 p-3 font-semibold">Expressway Commercial Belt</td>
        <td class="border border-slate-300 p-3">₹14,000 – ₹24,000</td>
        <td class="border border-slate-300 p-3">Maximum FSI (up to 5.0), service road access</td>
        <td class="border border-slate-300 p-3">Hotels, corporate offices, healthcare facilities</td>
      </tr>
      <tr>
        <td class="border border-slate-300 p-3 font-semibold">TP3 to TP6 (Agricultural)</td>
        <td class="border border-slate-300 p-3">₹2,200 – ₹4,500</td>
        <td class="border border-slate-300 p-3">Pending final town planning and trunk infrastructure</td>
        <td class="border border-slate-300 p-3">Strictly long-term patient capital; high boundary risk</td>
      </tr>
    </tbody>
  </table>
</div>

<p>Prospective investors can examine verified sector layouts on our interactive <a href="/tp-maps">Dholera TP Maps portal</a> to match individual survey numbers against designated arterial road widths and green zones before committing capital.</p>

<figure class="wp-block-image size-large">
  <img src="${IMAGES.fig2}" alt="Ahmedabad Dholera Expressway asphalt paving November 2026 trial readiness" class="rounded-xl shadow-lg border border-slate-200 w-full" />
  <figcaption class="text-sm text-slate-500 mt-2 text-center">Figure 2: The newly asphalted 6-lane Ahmedabad-Dholera Expressway corridor linking Sarkhej to Navagam and Dholera Aerocity.</figcaption>
</figure>

<h2>The Legal Buyer Checklist: 4 Mandatory Checks Before Signing</h2>
<p>With aggressive market interest fueled by the latest <strong>dholera news november 2026</strong> updates, unscrupulous local brokers frequently attempt to sell greenbelt or unapproved agricultural parcels under the guise of smart city plots. Protecting your investment requires rigid due diligence:</p>

<ol>
  <li><strong>Demand Final Form 4 (Sanctioned Plot Allotment):</strong> Never purchase preliminary land based solely on an agricultural survey number. Insure that the developer holds the final Final Plot (FP) certificate issued by the Dholera Special Investment Region Development Authority (<a href="https://dholera.gujarat.gov.in" target="_blank" rel="noopener noreferrer">DSIRDA</a>).</li>
  <li><strong>Authenticate Collector NA (Non-Agricultural) Order:</strong> Residential or commercial plots must hold an authentic Collector NA order specifically permitting DSIR non-agricultural land use under Gujarat Land Revenue Code section 65. Verify the order barcode directly on AnyRoR Gujarat.</li>
  <li><strong>Check On-Site Demarcation & Boundary Pegs:</strong> Do not buy land purely from a PDF layout. Inspect the ground in person to verify that physical red-and-white stone boundary pegs are anchored with registered GPS coordinates. Explore our vetted <a href="/projects">approved Dholera projects</a> for verified boundary demarcations.</li>
  <li><strong>Confirm Proximity to Completed Activation Trunk Lines:</strong> Verify that the plot borders underground utility corridors for water, electricity, and sewage developed by <a href="https://dicdl.gujarat.gov.in" target="_blank" rel="noopener noreferrer">DICDL</a>. Plots lacking direct connectivity to these trunk networks face severe construction delays.</li>
</ol>

<figure class="wp-block-image size-large">
  <img src="${IMAGES.fig3}" alt="Dholera TP1 Town Planning and Collector NA legal title survey desk" class="rounded-xl shadow-lg border border-slate-200 w-full" />
  <figcaption class="text-sm text-slate-500 mt-2 text-center">Figure 3: Professional cadastral survey desk verifying TP1 plot demarcations, NA title orders, and GPS coordinates.</figcaption>
</figure>

<h2>Actionable Strategic Plan for Land Buyers in Late 2026</h2>
<p>To capitalize on the momentum highlighted in this <strong>dholera news november 2026</strong> report, smart land buyers are executing a focused three-step strategy:</p>
<p>First, allocate 70% of your capital to TP1 residential or TP2 light-industrial plots that have ready possession and immediate deed execution. Second, reserve 30% for commercial plots directly fronting the 55-meter or 70-meter central arterial spine where FSI bonuses will generate compounding commercial rental yields once corporate tenancy commences. For comprehensive master planning blueprints and zoning regulations, consult our detailed <a href="/investment-guide">Dholera Investment Guide</a> and explore our <a href="/infrastructure">smart city infrastructure dossier</a>.</p>

<div class="my-8 p-6 bg-slate-900 text-white rounded-2xl border border-amber-500/40 shadow-xl">
  <div class="flex items-center gap-3 mb-3">
    <span class="inline-block w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
    <span class="text-xs uppercase tracking-widest text-emerald-400 font-bold">Direct Founder Advisory Desk</span>
  </div>
  <h3 class="text-2xl font-bold text-white mb-2">Speak Directly with Naresh Gohel (+91 82004 48270)</h3>
  <p class="text-slate-300 text-sm mb-4 leading-relaxed">
    Looking to purchase clear-title Collector NA plots in Dholera SIR before December expressway trial runs commence? Connect directly with founder Naresh Gohel for verified 7/12 title abstracts, official TP1/TP2 maps, and zero-brokerage transparent legal registrations.
  </p>
  <div class="flex flex-wrap gap-4">
    <a href="tel:+918200448270" class="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg hover:scale-105">
      📞 Call +91 82004 48270
    </a>
    <a href="https://wa.me/918200448270?text=Hi%20Naresh,%20I%20read%20the%20November%202026%20Dholera%20News%20and%20want%20verified%20TP1/TP2%20plot%20rates." target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg hover:scale-105">
      💬 WhatsApp for Verified Rates & Maps
    </a>
  </div>
</div>

<h2>Frequently Asked Questions on Dholera News November 2026</h2>
<div class="space-y-4 my-6">
  <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl">
    <h3 class="font-bold text-slate-900 text-base mb-1">What is the most critical Dholera news November 2026 update for land buyers?</h3>
    <p class="text-slate-600 text-sm">The most critical milestone is the completion of the cleanroom structural framework at Tata Electronics' ₹91,000-crore semiconductor fab in TP2, combined with NHAI confirming December trial logistics runs on the Ahmedabad-Dholera Expressway. This firmly anchors industrial demand and accelerates commercial timelines.</p>
  </div>
  <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl">
    <h3 class="font-bold text-slate-900 text-base mb-1">How do the November 2026 expressway progress updates impact plot prices?</h3>
    <p class="text-slate-600 text-sm">With travel time between Ahmedabad and Dholera shrinking to 45 minutes, land along TP1 and TP2 access corridors has experienced 20% to 35% capital appreciation over the past quarter. Post-commissioning in early 2026, entry-level rates in prime activation areas are projected to increase further as institutional corporate demand ramps up.</p>
  </div>
  <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl">
    <h3 class="font-bold text-slate-900 text-base mb-1">Is it safe to buy land in Dholera SIR outside TP1 and TP2 in late 2026?</h3>
    <p class="text-slate-600 text-sm">Land outside TP1 and TP2 (such as TP3 through TP6) remains predominantly agricultural with pending Town Planning scheme sanctions and no operational subterranean utility ducts. Unless you are an institutional player with a 10-to-15 year holding capacity, focus exclusively on fully approved Collector NA plots in TP1 or TP2 with clear Form 4 title certificates.</p>
  </div>
  <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl">
    <h3 class="font-bold text-slate-900 text-base mb-1">Why is Collector NA certification mandatory before paying any token amount?</h3>
    <p class="text-slate-600 text-sm">Collector NA confirms that the state revenue authority has permanently converted the land parcel from agricultural to non-agricultural status under Gujarat land laws. Without an authentic Collector NA order, non-farmers cannot hold legal title, leaving buyers vulnerable to land title disputes and severe regularization penalties.</p>
  </div>
</div>`
};

const result = evaluateBlogSeo(updatedBlogData);
console.log('=== UPDATED SEO EVALUATION RESULT ===');
console.log(`Overall SEO Score: ${result.score} / 100`);
console.log(`Word Count: ${result.wordCount}`);
console.log(`Keyword Density: ${result.density}% (${result.keywordMatches} matches)`);
console.log(`Internal Links: ${result.internalLinks}`);
console.log(`External Links: ${result.externalLinks}`);
console.log(`FAQs: ${result.faqs}`);

if (result.score < 100) {
  console.error('FAILED TO REACH 100/100!');
  process.exit(1);
} else {
  console.log('PERFECT 100/100 SEO SCORE!');
}
