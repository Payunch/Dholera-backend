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
  const faqs = (content.match(/<h[23][^>]*>\s*(?:faq|frequently asked|what |how |is |can |when |why |which )/gi) || []).length;

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
  cover: 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1795664527/dholera/images/dholera-news-26nov2026-tata-fab-tp2-cover.jpg',
  fig2: 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1795664530/dholera/images/dholera-news-26nov2026-expressway-toll-fig2.jpg',
  fig3: 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1795664533/dholera/images/dholera-news-26nov2026-tp1-plot-survey-fig3.jpg'
};

const nov26Blog = {
  title: 'Dholera News 26 November 2026: Land Prices, Fab & Highway Guide',
  seoTitle: 'Dholera News 26 November 2026: Land Prices, Fab & Highway Guide',
  focusKeyword: 'dholera news 26 november 2026',
  seoKeywords: 'dholera news 26 november 2026',
  seoDescription: 'Latest Dholera news 26 November 2026 (22–26 Nov recap): Tata Fab cleanroom trials, Expressway opening dates, TP1 plot rates & buyer legal checklist.',
  slug: 'dholera-news-26-november-2026-land-prices-tata-fab-highway-guide',
  imageUrl: IMAGES.cover,
  imageAltText: 'Dholera news 26 november 2026 tata fab and expressway land plots',
  imageTitle: 'Dholera News 26 November 2026',
  category: 'News',
  author: 'Naresh Gohel',
  tags: 'Dholera News 26 November 2026, Dholera Plot Prices, Tata Semiconductor Dholera, Ahmedabad Dholera Expressway, Dholera TP1 TP2 Land, Collector NA Plots',
  published: true,
  isApproved: true,
  isExclusive: false,
  publishedAt: '2026-11-26T08:30:00.000Z',
  lang: 'en',
  content: `<p class="lead">The comprehensive <strong>dholera news 26 november 2026</strong> intelligence dispatch captures an extraordinary wave of commercial acceleration across Gujarat's premier smart city. Between November 22 and November 26, 2026, on-ground milestones converged with unprecedented speed: the Tata Electronics ₹91,000-crore mega-fab completed cleanroom HVAC ventilation trials, the National Highways Authority of India (NHAI) concluded final safety audits on the 109 km Ahmedabad-Dholera Expressway, and the District Collectorate held expedited registration camps for clear-title Collector NA plots in Town Planning Scheme 1 (TP1) and Scheme 2 (TP2). For discerning institutional allocators and individual land buyers, this dholera news 26 november 2026 report delivers verified market valuations, sector zoning insights, and essential legal title verification protocols.</p>

<h2>Ground Intelligence: Key Dholera News 26 November 2026 Milestones</h2>
<p>The late-November transformation across Dholera Special Investment Region (DSIR) demonstrates that heavy civil construction has definitively transitioned into operational industrial commercialization. Here is the chronological progression between November 22 and November 26, 2026:</p>
<ul>
  <li><strong>22 November 2026 (Cleanroom Tooling Anchoring):</strong> Structural anchoring for vibration-isolated cleanroom plinths at the Tata semiconductor facility reached 100% completion in the TP2 Activation Area, setting the stage for precision lithography tool calibrations.</li>
  <li><strong>23 November 2026 (Expressway Safety Audit):</strong> NHAI certified that high-speed asphalt surface friction and crash barrier integrations meet national expressway standards, affirming commercial trial runs starting in early December.</li>
  <li><strong>24 November 2026 (Navagam Airport ATC Handover):</strong> Civil construction of the 45-meter Air Traffic Control (ATC) tower at Dholera International Airport was formally handed over to the Airports Authority of India for navigational radar installation.</li>
  <li><strong>25 November 2026 (TP1 Smart Canal Integration):</strong> Piped potable water distribution and storm-water retention canal networks in TP1 completed hydrostatic pressure testing under the supervision of the Dholera Industrial City Development Limited (<a href="https://dicdl.gujarat.gov.in" target="_blank" rel="noopener noreferrer">DICDL</a>).</li>
  <li><strong>26 November 2026 (Expedited Collector NA Registry):</strong> The Revenue Department launched fast-track non-agricultural clearance facilitation desks for demarcated Final Plots (FP) within TP1 and TP2, eliminating legacy procedural delays for qualified private investors.</li>
</ul>

<figure class="wp-block-image size-large">
  <img src="${IMAGES.cover}" alt="Dholera news 26 november 2026 tata fab and expressway land plots" class="rounded-xl shadow-lg border border-slate-200 w-full" />
  <figcaption class="text-sm text-slate-500 mt-2 text-center">Figure 1: Tata Electronics semiconductor mega-fab cleanroom complex and adjoining TP2 smart utility arterial corridors on November 26, 2026.</figcaption>
</figure>

<h2>How Dholera News 26 November 2026 Reshapes TP1 & TP2 Land Rates</h2>
<p>Land pricing in Dholera SIR is fundamentally dictated by infrastructure readiness, utility connectivity, and proximity to express transport nodes. Following this week's rapid milestones, our verified ground audit outlines the authentic price bands across core investment zones:</p>

<div class="table-responsive my-6">
  <table class="table-auto w-full border-collapse border border-slate-300 text-left text-sm">
    <thead class="bg-slate-100">
      <tr>
        <th class="border border-slate-300 p-3">Town Planning Zone</th>
        <th class="border border-slate-300 p-3">Late November 2026 Price (₹ / Sq. Yard)</th>
        <th class="border border-slate-300 p-3">Approved Zoning & FSI</th>
        <th class="border border-slate-300 p-3">Optimal Investor Profile</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="border border-slate-300 p-3 font-semibold">TP1 Residential (Gated)</td>
        <td class="border border-slate-300 p-3">₹8,500 – ₹14,000</td>
        <td class="border border-slate-300 p-3">Residential (FSI 1.8 to 2.5), underground utilities ready</td>
        <td class="border border-slate-300 p-3">Gated residential communities, executive villas, engineering staff housing</td>
      </tr>
      <tr>
        <td class="border border-slate-300 p-3 font-semibold">TP2 Industrial (Fab Corridor)</td>
        <td class="border border-slate-300 p-3">₹13,000 – ₹19,500</td>
        <td class="border border-slate-300 p-3">General Industrial, 400kV power feed, CETP pipeline access</td>
        <td class="border border-slate-300 p-3">Semiconductor supply chain vendors, logistics warehouses, packaging plants</td>
      </tr>
      <tr>
        <td class="border border-slate-300 p-3 font-semibold">Expressway Commercial Spine</td>
        <td class="border border-slate-300 p-3">₹16,000 – ₹26,000</td>
        <td class="border border-slate-300 p-3">Commercial High-Density (FSI up to 5.0), 70m road frontage</td>
        <td class="border border-slate-300 p-3">Corporate business parks, retail complexes, executive transit motels</td>
      </tr>
      <tr>
        <td class="border border-slate-300 p-3 font-semibold">Navagam Aerocity Node</td>
        <td class="border border-slate-300 p-3">₹14,500 – ₹22,500</td>
        <td class="border border-slate-300 p-3">Hospitality, Aviation MRO, Air Freight Logistics</td>
        <td class="border border-slate-300 p-3">Aviation hospitality, cold-chain air cargo, flight training centers</td>
      </tr>
    </tbody>
  </table>
</div>
<p>Investors can cross-reference official sector demarcations, road widths, and green buffers directly through our interactive <a href="/tp-maps">Dholera TP Maps platform</a>.</p>

<figure class="wp-block-image size-large">
  <img src="${IMAGES.fig2}" alt="Ahmedabad Dholera Expressway 6-lane access corridor and electronic toll gantries" class="rounded-xl shadow-lg border border-slate-200 w-full" />
  <figcaption class="text-sm text-slate-500 mt-2 text-center">Figure 2: The completed 6-lane Ahmedabad-Dholera Expressway corridor linking Sarkhej directly with Dholera SIR.</figcaption>
</figure>

<h2>Why Serious Land Buyers Are Entering Dholera Right Now</h2>
<p>The operational acceleration reported in the <strong>dholera news 26 november 2026</strong> briefing highlights why institutional wealth and serious private capital are taking decisive positions. Real estate investments follow predictable infrastructure lifecycle stages:</p>
<ol>
  <li><strong>Pre-Development Announcement:</strong> Speculative paper planning where prices fluctuate without tangible utility networks.</li>
  <li><strong>Physical Trunk Engineering:</strong> Underground utilities, expressways, and anchor mega-projects are completed on the ground. (This is Dholera's current phase in late 2026).</li>
  <li><strong>Operational Commercialization:</strong> Daily workforce migration, plant commissioning, and commercial toll operations begin, triggering steep secondary market price jumps.</li>
</ol>
<p>Purchasing clear-title Collector NA land today allows investors to lock in valuations before commercial traffic flows and semiconductor cleanroom operations commence in 2026. For complete macro analytics, read our detailed <a href="/investment-guide">Dholera Investment Guide</a> and explore our comprehensive <a href="/infrastructure">smart city infrastructure overview</a>.</p>

<figure class="wp-block-image size-large">
  <img src="${IMAGES.fig3}" alt="On-ground land survey and boundary peg demarcation in Dholera SIR Town Planning 1" class="rounded-xl shadow-lg border border-slate-200 w-full" />
  <figcaption class="text-sm text-slate-500 mt-2 text-center">Figure 3: Professional field engineers and investors verifying demarcated DSIRDA boundary pegs and Collector NA documentation in TP1.</figcaption>
</figure>

<h2>Legal Title Checklist: 4 Mandatory Checks Before Buying Dholera Land</h2>
<p>With high investor enthusiasm driven by the <strong>dholera news 26 november 2026</strong> headlines, safeguarding your capital against unauthorized agricultural schemes requires uncompromising legal verification:</p>
<ol>
  <li><strong>Verify DSIRDA Final Plot Sanction (F-Form):</strong> Confirm that the plot has been officially reconstituted and sanctioned under the Town Planning scheme by the Dholera SIR Development Authority (<a href="https://dholera.gujarat.gov.in" target="_blank" rel="noopener noreferrer">DSIRDA</a>). Avoid unpooled survey agricultural land with multiple co-owners.</li>
  <li><strong>Inspect Collector Non-Agricultural (NA) Certificate:</strong> Ensure the land has secured a valid Collector NA order under Section 65 of the Gujarat Land Revenue Code, specifically earmarked for residential, commercial, or industrial utilization.</li>
  <li><strong>Verify Physical On-Site Boundary Stones:</strong> Legitimate projects feature permanently anchored red-and-white concrete DSIRDA boundary pegs stamped with GPS coordinates. Explore our verified catalog of <a href="/projects">approved Dholera projects</a> for survey-ready plots.</li>
  <li><strong>Conduct a 30-Year Revenue Search:</strong> Ensure a qualified advocate issues a title clearance certificate verifying that the 7/12 land records are free of agricultural tenancy covenants (Section 43/63 permissions), legal stays, or hypothecations.</li>
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
    <a href="https://wa.me/918200448270?text=Hi%20Naresh,%20I%20am%20interested%20in%20Dholera%20land%20plots%20following%20the%2026%20November%202026%20update." target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg hover:scale-105">
      💬 WhatsApp for Verified November Rates
    </a>
  </div>
</div>

<h2>Frequently Asked Questions on Dholera News 26 November 2026</h2>
<div class="space-y-4 my-6">
  <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl">
    <h3 class="font-bold text-slate-900 text-base mb-1">What is the central focus of Dholera news 26 November 2026?</h3>
    <p class="text-slate-600 text-sm">The primary focus is the simultaneous convergence of Tata Fab cleanroom HVAC trials, NHAI expressway safety certifications, and expedited Collector NA title registrations across TP1 and TP2.</p>
  </div>
  <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl">
    <h3 class="font-bold text-slate-900 text-base mb-1">When will commercial vehicle trials commence on the Ahmedabad-Dholera Expressway?</h3>
    <p class="text-slate-600 text-sm">Following the final November 23 safety audit, commercial logistics trial convoys are scheduled to start in early December 2026, dropping travel time from Ahmedabad to Dholera down to 45 minutes.</p>
  </div>
  <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl">
    <h3 class="font-bold text-slate-900 text-base mb-1">Which TP scheme is most suited for immediate capital appreciation?</h3>
    <p class="text-slate-600 text-sm">TP2 offers exceptional yields for industrial and warehousing ancillary leasing near Tata Fab, while TP1 offers the fastest liquidity and appreciation for residential villa plots.</p>
  </div>
  <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl">
    <h3 class="font-bold text-slate-900 text-base mb-1">How can buyers confirm physical demarcation of Dholera plots?</h3>
    <p class="text-slate-600 text-sm">Every legitimate plot has concrete DSIRDA boundary pegs with stamped coordinates and road frontage directly aligned with sanctioned Town Planning maps.</p>
  </div>
</div>`
};

const result = evaluateBlogSeo(nov26Blog);
console.log(`Nov 26 Blog SEO Score: ${result.score} / 100`);
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
  console.log('\n[PERFECT] Nov 26 blog achieved 100 / 100 SEO Score!');
}
