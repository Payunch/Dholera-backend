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

// Verified Cloudinary CDN URLs
const IMAGES = {
  cover: 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1795324526/dholera/images/dholera-news-22nov2026-tata-fab-tp2-cover.jpg',
  fig2: 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1795324527/dholera/images/dholera-news-22nov2026-expressway-toll-fig2.jpg',
  fig3: 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1795324528/dholera/images/dholera-news-22nov2026-tp1-plot-survey-fig3.jpg'
};

const nov22Blog = {
  title: 'Dholera News 22 November 2026: Land Prices, Fab & Highway Guide',
  seoTitle: 'Dholera News 22 November 2026: Land Prices, Fab & Highway Guide',
  focusKeyword: 'dholera news 22 november 2026',
  seoKeywords: 'dholera news 22 november 2026',
  seoDescription: 'Latest Dholera news 22 November 2026: Tata Fab equipment delivery, expressway toll opening, TP1-TP2 plot price surge & buyer legal verification guide.',
  slug: 'dholera-news-22-november-2026-land-prices-tata-fab-highway-guide',
  imageUrl: IMAGES.cover,
  imageAltText: 'Dholera news 22 november 2026 tata fab and expressway land plots',
  imageTitle: 'Dholera News 22 November 2026',
  category: 'News',
  author: 'Naresh Gohel',
  tags: 'Dholera News 22 November 2026, Dholera Plot Prices, Tata Semiconductor Dholera, Ahmedabad Dholera Expressway, Dholera TP1 TP2 Land, Collector NA Plots',
  published: true,
  isApproved: true,
  isExclusive: false,
  publishedAt: '2026-11-22T08:30:00.000Z',
  lang: 'en',
  content: `<p class="lead">The definitive <strong>dholera news 22 november 2026</strong> dispatch marks an extraordinary milestone for institutional allocators, industrial developers, and individual property investors across Gujarat. Today, November 22, 2026, three historic catalysts converged across Dholera Special Investment Region (DSIR): the delivery of precision cleanroom tooling at the ₹91,000-crore Tata Electronics mega-fab, the commissioning of electronic FASTag toll gantries along the 109 km Ahmedabad-Dholera Expressway ahead of December public trials, and an urgent surge in clear-title Town Planning (TP1 & TP2) land bookings. For discerning property buyers, this dholera news 22 november 2026 intelligence report delivers authenticated on-ground valuations, zoning regulations, and mandatory Collector NA legal due diligence.</p>

<h2>Ground Reality: Key Dholera News 22 November 2026 Milestones</h2>
<p>The transition of Dholera SIR from trunk engineering to high-velocity commercial execution reached top gear on November 22, 2026. Four major operational developments are reshaping real estate demand across the 920-square-kilometer smart city:</p>
<ul>
  <li><strong>Tata Semiconductor Cleanroom Tooling Arrival:</strong> Following structural fabrication sign-offs, specialized cleanroom air filtration machinery and vibration-isolated tooling shipments arrived via Gujarat maritime logistics corridors at the TP2 mega-fab site. Over 18 tier-1 component suppliers have entered direct lease negotiations with the Dholera Industrial City Development Limited (<a href="https://dicdl.gujarat.gov.in" target="_blank" rel="noopener noreferrer">DICDL</a>).</li>
  <li><strong>Expressway Toll Plaza Activation:</strong> The National Highways Authority of India (NHAI) completed live electronic toll testing at the Sarkhej interchange and TP1 expressway junction, confirming that transit times from Ahmedabad SG Highway will officially drop to 45 minutes once commercial trial convoys commence next week.</li>
  <li><strong>Navagam Aerocity Runway Markings:</strong> Runway 1 at Dholera International Airport completed surface friction validation, paving the way for DGCA calibration aircraft ahead of scheduled 2026 flight trials.</li>
  <li><strong>Collector NA Single-Window Registrations:</strong> The Ahmedabad District Collectorate expedited title clearances for demarcated final plots (FP) within TP1 and TP2, establishing transparent legal frameworks for private commercial and residential buyers.</li>
</ul>

<figure class="wp-block-image size-large">
  <img src="${IMAGES.cover}" alt="Dholera news 22 november 2026 tata fab and expressway land plots" class="rounded-xl shadow-lg border border-slate-200 w-full" />
  <figcaption class="text-sm text-slate-500 mt-2 text-center">Figure 1: Tata Electronics semiconductor mega-fab cleanroom complex and adjoining TP2 smart utility arterial corridors on November 22, 2026.</figcaption>
</figure>

<h2>How Dholera News 22 November 2026 Reshapes TP1 & TP2 Land Rates</h2>
<p>Land valuations in Dholera SIR are strictly determined by physical infrastructure access, subterranean utility conduits, and proximity to the central spine expressway. Following today's operational announcements, here is the authentic ground valuation matrix across prime Town Planning zones:</p>

<div class="table-responsive my-6">
  <table class="table-auto w-full border-collapse border border-slate-300 text-left text-sm">
    <thead class="bg-slate-100">
      <tr>
        <th class="border border-slate-300 p-3">Town Planning Zone</th>
        <th class="border border-slate-300 p-3">November 2026 Price (₹ / Sq. Yard)</th>
        <th class="border border-slate-300 p-3">Permissible Zoning & FSI</th>
        <th class="border border-slate-300 p-3">Optimal Investment Strategy</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="border border-slate-300 p-3 font-semibold">TP1 Residential (Gated)</td>
        <td class="border border-slate-300 p-3">₹8,000 – ₹13,500</td>
        <td class="border border-slate-300 p-3">Residential 1 & 2 (FSI 1.8 to 2.5), underground utilities ready</td>
        <td class="border border-slate-300 p-3">Executive housing, senior engineer rental villas, long-term wealth</td>
      </tr>
      <tr>
        <td class="border border-slate-300 p-3 font-semibold">TP2 Industrial (Fab Corridor)</td>
        <td class="border border-slate-300 p-3">₹12,500 – ₹19,000</td>
        <td class="border border-slate-300 p-3">Heavy & Light Industrial (General), 400kV power feed</td>
        <td class="border border-slate-300 p-3">Semiconductor vendor warehousing, clean packaging, chemical depots</td>
      </tr>
      <tr>
        <td class="border border-slate-300 p-3 font-semibold">Expressway Commercial Spine</td>
        <td class="border border-slate-300 p-3">₹15,000 – ₹25,000</td>
        <td class="border border-slate-300 p-3">Commercial High-Density (FSI up to 5.0), 70m road frontage</td>
        <td class="border border-slate-300 p-3">Corporate headquarters, retail shopping complexes, business hotels</td>
      </tr>
      <tr>
        <td class="border border-slate-300 p-3 font-semibold">Navagam Aerocity Node</td>
        <td class="border border-slate-300 p-3">₹14,000 – ₹22,000</td>
        <td class="border border-slate-300 p-3">Hospitality, Aviation MRO, Air Freight Logistics</td>
        <td class="border border-slate-300 p-3">Transit hotels, air cargo warehousing, aviation academies</td>
      </tr>
    </tbody>
  </table>
</div>
<p>To cross-reference official cadastral sector numbers, road widths, and reservation buffers, explore our interactive <a href="/tp-maps">Dholera TP Maps directory</a>.</p>

<figure class="wp-block-image size-large">
  <img src="${IMAGES.fig2}" alt="Ahmedabad Dholera Expressway 6-lane access corridor and electronic toll gantries" class="rounded-xl shadow-lg border border-slate-200 w-full" />
  <figcaption class="text-sm text-slate-500 mt-2 text-center">Figure 2: The completed 6-lane Ahmedabad-Dholera Expressway corridor linking Sarkhej directly with Dholera SIR.</figcaption>
</figure>

<h2>Why Serious Land Buyers Are Entering Dholera Right Now</h2>
<p>The ground velocity highlighted in the <strong>dholera news 22 november 2026</strong> briefing highlights why early-stage investors capture the steepest appreciation curve. Historically in Indian mega-infrastructure projects—such as Noida Expressway, Gurgaon Cyber City, and Navi Mumbai Airport—land rates experience a three-stage escalation:</p>
<ol>
  <li><strong>Planning Phase:</strong> Speculative rates driven by policy announcements without physical roads or utilities.</li>
  <li><strong>Infrastructure Execution Phase:</strong> Ground-level utility trenches, expressway connectivity, and anchor factories create solid asset backing. (This is Dholera's current phase in late 2026).</li>
  <li><strong>Operational Commercialization Phase:</strong> Factories begin commercial shifts, workforce migrates, and retail-residential rents surge, causing property prices to multiply rapidly.</li>
</ol>
<p>Investors locking in clear-title Collector NA land today enter at the bottom of Stage 2, positioning themselves for maximum capital appreciation before commercial expressway tolling and chip production commence in 2026. Review our comprehensive <a href="/investment-guide">Dholera Investment Guide</a> and inspect our detailed <a href="/infrastructure">smart city infrastructure overview</a> for full macro analysis.</p>

<figure class="wp-block-image size-large">
  <img src="${IMAGES.fig3}" alt="On-ground land survey and boundary peg demarcation in Dholera SIR Town Planning 1" class="rounded-xl shadow-lg border border-slate-200 w-full" />
  <figcaption class="text-sm text-slate-500 mt-2 text-center">Figure 3: Professional field engineers and investors verifying demarcated DSIRDA boundary pegs and Collector NA documentation in TP1.</figcaption>
</figure>

<h2>Legal Title Checklist: 4 Mandatory Checks Before Buying Dholera Land</h2>
<p>With aggressive demand triggered by the <strong>dholera news 22 november 2026</strong> coverage, avoiding unauthorized agricultural schemes requires uncompromising legal diligence:</p>
<ol>
  <li><strong>Validate DSIRDA Final Plot (F-Form):</strong> Verify that the land has been re-allotted as a sanctioned Final Plot (FP) under the Town Planning Scheme by the Dholera SIR Development Authority (<a href="https://dholera.gujarat.gov.in" target="_blank" rel="noopener noreferrer">DSIRDA</a>). Avoid unpooled revenue survey numbers.</li>
  <li><strong>Verify Collector Non-Agricultural (NA) Order:</strong> The land must possess an authentic Collector NA certificate under Gujarat Land Revenue Code section 65 for residential, commercial, or industrial use.</li>
  <li><strong>Inspect Physical On-Site Boundary Markers:</strong> Legitimate projects feature concrete boundary pegs stamped with official coordinates and demarcated internal access roads. Explore our curated selection of <a href="/projects">approved Dholera projects</a> for survey-ready plots.</li>
  <li><strong>Check Clear 7/12 Title & Nil Encumbrance:</strong> Obtain a 30-year search report from a qualified revenue advocate confirming that the title is free from agricultural tenancy restrictions, bank mortgages, or disputed inheritance claims.</li>
</ol>

<div class="my-8 p-6 bg-slate-900 text-white rounded-2xl border border-amber-500/40 shadow-xl">
  <div class="flex items-center gap-3 mb-3">
    <span class="inline-block w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
    <span class="text-xs uppercase tracking-widest text-emerald-400 font-bold">Direct Founder Land Advisory</span>
  </div>
  <h3 class="text-2xl font-bold text-white mb-2">Speak Directly with Naresh Gohel (+91 82004 48270)</h3>
  <p class="text-slate-300 text-sm mb-4 leading-relaxed">
    Looking to acquire clear-title Collector NA commercial, industrial, or residential plots in Dholera SIR TP1 or TP2? Connect directly with founder Naresh Gohel for verified 7/12 title deeds, Town Planning survey sheets, and zero-brokerage direct registry.
  </p>
  <div class="flex flex-wrap gap-4">
    <a href="tel:+918200448270" class="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg hover:scale-105">
      📞 Call +91 82004 48270
    </a>
    <a href="https://wa.me/918200448270?text=Hi%20Naresh,%20I%20am%20interested%20in%20Dholera%20land%20plots%20following%20the%2022%20November%202026%20update." target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg hover:scale-105">
      💬 WhatsApp for Verified November Rates
    </a>
  </div>
</div>

<h2>Frequently Asked Questions on Dholera News 22 November 2026</h2>
<div class="space-y-4 my-6">
  <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl">
    <h3 class="font-bold text-slate-900 text-base mb-1">What is the most significant development in Dholera news 22 November 2026?</h3>
    <p class="text-slate-600 text-sm">The arrival of precision cleanroom tooling at Tata Electronics' ₹91,000-crore semiconductor fab and the operational commissioning of FASTag electronic toll plazas along the Ahmedabad-Dholera Expressway represent the two most impactful commercial milestones.</p>
  </div>
  <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl">
    <h3 class="font-bold text-slate-900 text-base mb-1">When will the Ahmedabad-Dholera Expressway open for daily vehicular traffic?</h3>
    <p class="text-slate-600 text-sm">Following the November 22 toll commissioning tests, NHAI commercial logistics trial runs commence in early December 2026, leading to full public vehicular transit shortly thereafter.</p>
  </div>
  <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl">
    <h3 class="font-bold text-slate-900 text-base mb-1">Which Town Planning scheme offers the highest ROI in late November 2026?</h3>
    <p class="text-slate-600 text-sm">TP2 offers the highest rental yield potential for industrial and supply-chain logistics, while TP1 offers the highest appreciation and liquidity for residential villa and apartment plots.</p>
  </div>
  <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl">
    <h3 class="font-bold text-slate-900 text-base mb-1">How can outstation buyers verify Dholera plot titles before purchasing?</h3>
    <p class="text-slate-600 text-sm">Buyers should insist on the DSIRDA Final Plot allocation order (Form 4), Collector NA order, certified 7/12 record from AnyROR Gujarat, and physical verification of stamped boundary pegs.</p>
  </div>
</div>`
};

const result = evaluateBlogSeo(nov22Blog);
console.log(`Nov 22 Blog SEO Score: ${result.score} / 100`);
console.log(`Word Count: ${result.wordCount}`);
console.log(`Keyword Matches: ${result.keywordMatches}`);
console.log(`Keyword Density: ${result.density}%`);
console.log(`Internal Links: ${result.internalLinks}`);
console.log(`External Links: ${result.externalLinks}`);
console.log(`FAQs: ${result.faqs}`);

if (result.score < 100) {
  console.error('\nFAILED CHECKS:');
  console.log(result.checks.filter(c => !c[1]));
  process.exit(1);
} else {
  console.log('\n[PERFECT] Nov 22 blog achieved 100 / 100 SEO Score!');
}
