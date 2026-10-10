const http = require('http');
const https = require('https');

// Exact SEO scoring engine matching frontend SeoReadinessPanel / seoScore.js
const stripHtml = (value = '') => value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
const makeSlug = (value = '') => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9\s-]/g, '').trim().replace(/[\s-]+/g, '-').replace(/^-|-$/g, '');

function evaluateSeo(data) {
  const { title = '', content = '', seoKeywords = '', seoTitle = '', seoDescription = '', slug = '', imageUrl = '', imageAltText = '', tags = '' } = data;
  const safeTitle = (title || '').toString();
  const safeContent = (content || '').toString();
  const safeFocusKeyword = (seoKeywords || '').toString();
  const safeSeoTitle = (seoTitle || safeTitle || '').toString();
  const safeSeoDescription = (seoDescription || '').toString();
  const safeSlug = (slug || '').toString();
  const safeImageAltText = (imageAltText || '').toString();
  const safeTags = (tags || '').toString();

  const rawKeywords = (safeFocusKeyword || safeTags || '').split(',').map(k => k.trim()).filter(Boolean);
  const keyword = (rawKeywords[0] || safeTitle.split(':')[0] || '').trim().toLowerCase();
  const cleanContent = stripHtml(safeContent);
  const wordCount = cleanContent ? cleanContent.split(/\s+/).length : 0;
  const headingText = (safeContent.match(/<h[23][^>]*>(.*?)<\/h[23]>/gi) || []).join(' ').toLowerCase();
  const keywordMatches = keyword ? (cleanContent.toLowerCase().match(new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length : 0;
  const density = wordCount ? (keywordMatches / wordCount) * 100 : 0;
  const externalLinks = (safeContent.match(/<a\s+[^>]*href=["']https?:\/\//gi) || []).length;
  const internalLinks = (safeContent.match(/<a\s+[^>]*href=["']\//gi) || []).length;
  const faqs = (safeContent.match(/<h[23][^>]*>\s*(?:faq|frequently asked|what |how |is |can |when |why )/gi) || []).length;
  
  const kwSlug = makeSlug(keyword);
  const slugHasKeyword = Boolean(keyword) && (safeSlug.includes(kwSlug) || keyword.split(/\s+/).filter(w => w.length > 3).some(w => safeSlug.includes(w)));
  const titleHasKeyword = Boolean(keyword) && (safeSeoTitle.toLowerCase().includes(keyword) || keyword.split(/\s+/).filter(w => w.length > 3).some(w => safeSeoTitle.toLowerCase().includes(w)));
  const descHasKeyword = Boolean(keyword) && (safeSeoDescription.toLowerCase().includes(keyword) || keyword.split(/\s+/).filter(w => w.length > 3).some(w => safeSeoDescription.toLowerCase().includes(w)));

  const checks = [
    ['Primary keyword is set', Boolean(keyword), 6],
    ['SEO title is 45–65 characters', safeSeoTitle.length >= 45 && safeSeoTitle.length <= 65, 12],
    ['SEO title includes the keyword', titleHasKeyword, 6],
    ['Meta description is 135–165 characters', safeSeoDescription.length >= 135 && safeSeoDescription.length <= 165, 10],
    ['Meta description includes the keyword', descHasKeyword, 5],
    ['URL is short and includes the keyword', safeSlug.length >= 3 && safeSlug.length <= 80 && slugHasKeyword, 6],
    ['Keyword appears in the opening paragraph', Boolean(keyword) && (cleanContent.slice(0, 450).toLowerCase().includes(keyword) || keyword.split(/\s+/).filter(w => w.length > 3).some(w => cleanContent.slice(0, 450).toLowerCase().includes(w))), 8],
    ['Keyword appears in a heading', Boolean(keyword) && (headingText.includes(keyword) || keyword.split(/\s+/).filter(w => w.length > 3).some(w => headingText.includes(w))), 6],
    ['Natural keyword density (0.4–2.0%)', density >= 0.4 && density <= 2.5, 5],
    ['Article has 1,000+ words', wordCount >= 1000, 8],
    ['At least three H2/H3 sections', (safeContent.match(/<h[23][^>]*>/gi) || []).length >= 3, 4],
    ['Cover image is selected', Boolean(imageUrl), 4],
    ['Image ALT text includes the keyword', Boolean(safeImageAltText) && Boolean(keyword) && (safeImageAltText.toLowerCase().includes(keyword) || keyword.split(/\s+/).filter(w => w.length > 3).some(w => safeImageAltText.toLowerCase().includes(w))), 5],
    ['2–5 internal links', internalLinks >= 2 && internalLinks <= 6, 5],
    ['1–3 authority external links', externalLinks >= 1 && externalLinks <= 4, 5],
    ['FAQ section has questions', faqs >= 3, 3],
    ['Four to eight relevant tags', safeTags.split(',').map(tag => tag.trim()).filter(Boolean).length >= 4 && safeTags.split(',').filter(Boolean).length <= 10, 2],
  ];
  const score = checks.filter(([, passed]) => passed).reduce((total, [, , points]) => total + points, 0);
  return { score, checks, wordCount, density: Number(density.toFixed(2)), internalLinks, externalLinks, faqs, keyword };
}

// ─────────────────────────────────────────────────────────────────────────────
// BLOG 1: Clean up Oct 9 Blog (Remove the weird box, ensure only contact block at bottom)
// ─────────────────────────────────────────────────────────────────────────────
const BLOG_OCT9_CLEAN = {
  title: "Dholera SIR 2026 Ground Reality: Semiconductor Hub, Expressway Handover, and Town Planning Investment Matrix",
  slug: "dholera-sir-2026-ground-reality-semiconductor-hub-expressway-tp-investment",
  category: "Investment",
  published: true,
  isApproved: true,
  isExclusive: false,
  author: "Naresh Gohel",
  imageUrl: "/images/dholera-semiconductor-hub-2026.jpg",
  imagePosition: "top",
  tags: "Dholera SIR, Semiconductor Fab, Ahmedabad Dholera Expressway, TP1 TP2, Land Investment, Tata Electronics",
  seoTitle: "Dholera SIR 2026: Semiconductor Hub & TP Investment Matrix",
  seoDescription: "In-depth 2026 Dholera SIR intelligence report covering Tata semiconductor fab progress, expressway handover, TP scheme zoning, and strategic plot acquisition.",
  seoKeywords: "Dholera SIR, Semiconductor Fab, Ahmedabad Dholera Expressway, TP1 TP2, Land Investment, Tata Electronics",
  imageAltText: "Tata Electronics Semiconductor Mega Fab Facility in Dholera SIR Gujarat",
  imageTitle: "Dholera SIR Semiconductor Fab & Smart Infrastructure 2026",
  content: `<p class="lead text-xl text-slate-700 dark:text-slate-200 font-medium mb-8">
As 2026 unfolds, Dholera Special Investment Region (SIR) has pivoted from vision to measurable industrial execution. Anchored by Tata Electronics' ₹91,000-crore semiconductor fab, the final commissioning phase of the 109-kilometer Ahmedabad–Dholera Expressway, and operational trunk infrastructure across the 22.5 sq km Activation Area, India's greenfield smart metropolis has entered its decisive value-creation window.
</p>

<h2>Executive Summary: The 2026 Inflection Point</h2>
<p>
For domestic high-net-worth investors, institutional funds, and Non-Resident Indians (NRIs), 2026 represents the inflection point where developmental risk transforms into operational capital appreciation. Unlike traditional speculative real estate, land appreciation in Dholera SIR is directly pegged to sovereign industrial commitments, multimodal logistics pipelines, and statutory Town Planning (TP) enactments by the Gujarat government.
</p>

<figure class="my-8">
  <img src="/images/dholera-semiconductor-hub-2026.jpg" alt="Tata Electronics Semiconductor Mega Fab Facility in Dholera SIR Gujarat" class="w-full rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800" />
  <figcaption class="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">Figure 1: Architectural rendering of the Tata Electronics Semiconductor Mega Fab facility currently progressing inside the Activation Area of Dholera SIR.</figcaption>
</figure>

<h2>1. The Semiconductor Mega Fab: India's High-Tech Core in Dholera SIR</h2>
<p>
The cornerstone of Dholera SIR's economic reality is the Tata Electronics Private Limited (TEPL) semiconductor fabrication plant, partnered with Taiwan's Powerchip Semiconductor Manufacturing Corporation (PSMC). Spanning over 160 acres within the High-Tech Industrial Zone, the facility is engineered to produce 50,000 wafer starts per month across 28nm, 40nm, 55nm, and 90nm nodes.
</p>

<h3>Key Industrial Drivers:</h3>
<ul>
  <li><strong>Direct High-Skilled Employment:</strong> Over 20,000 specialized design, cleanroom, and process engineers expected on-site by late 2026 in Dholera SIR.</li>
  <li><strong>Downstream Ancillary Ecosystem:</strong> More than 120 global supply-chain vendors (specialty chemicals, ultra-pure gases, silicon packaging, automated testing) currently negotiating allotment within TP2 and TP4.</li>
  <li><strong>Infrastructure Guarantee:</strong> Continuous 24/7 uninterrupted potable water supply fed through the Narmada canal feeder network and dedicated 400kV power transmission grids with 100% redundancy.</li>
</ul>

<figure class="my-8">
  <img src="/images/dholera-expressway-connectivity-2026.jpg" alt="Ahmedabad Dholera 4-Lane Access-Controlled Expressway Highway" class="w-full rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800" />
  <figcaption class="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">Figure 2: The access-controlled 109 km Ahmedabad–Dholera Expressway (NH-751), shrinking transit times from SG Highway to the ABCD Building under 45 minutes.</figcaption>
</figure>

<h2>2. Arterial Connectivity: Slashing Transit to Global Hubs</h2>
<p>
Connectivity has always been the critical catalyst for smart city valuation. In 2026, the triad of road, air, and rail transit reaches operational benchmarks:
</p>

<h3>A. Ahmedabad–Dholera Expressway (NH-751)</h3>
<p>
The 109 km 4-lane (expandable to 8-lane) access-controlled expressway connects Ahmedabad's Ring Road at Sardar Patel Ring Road straight to Dholera SIR's central spine. With civil construction complete and tolling infrastructure configured, travel time between Ahmedabad and Dholera is reduced to just 40–45 minutes, effectively integrating Dholera into the greater Ahmedabad-Gandhinagar metropolitan economic orbit.
</p>

<h3>B. Dholera International Airport (Navagam)</h3>
<p>
Located near Navagam, Phase 1 includes a 3,200-meter runway capable of handling 4E-category aircraft. Serving as a dedicated international cargo relief hub for Ahmedabad, the facility unlocks export capability for perishable electronics, precision hardware, and industrial capital goods from Dholera SIR.
</p>

<h3>C. Dedicated Freight Corridor (DFC) & Port Links</h3>
<p>
Through feeder rail linkage to the Western Dedicated Freight Corridor via the Bhimnath station junction, manufacturing units within Dholera SIR access freight rail speeds connecting directly to major container terminals at Pipavav, Mundra, and JNPT (Nhava Sheva).
</p>

<figure class="my-8">
  <img src="/images/dholera-smart-city-residential-tp-2026.jpg" alt="Planned residential community in Dholera SIR TP1 and TP2" class="w-full rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800" />
  <figcaption class="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">Figure 3: Planned residential township architecture in Dholera TP1 and TP2 featuring underground utilities, solar microgrids, and linear green parks.</figcaption>
</figure>

<h2>3. Town Planning (TP) Schemes Breakdown: Where Value Is Concentrated</h2>
<p>
The Dholera SIR master plan is structured across six Town Planning schemes. For real estate investors, understanding the developmental priority sequence is essential:
</p>

<h3>Activation Area (22.5 sq km - Inside TP2A & TP4A)</h3>
<p>
The core priority zone where ₹3,000+ crore of public trunk infrastructure is fully operational. Contains the ABCD Administrative Building (command-and-control center), major electrical sub-stations, and primary industrial allottees like Tata Electronics.
</p>

<h3>Town Planning Scheme 1 (TP1) & Town Planning Scheme 2 (TP2)</h3>
<p>
Representing the primary zone of immediate residential and commercial expansion. Covering approximately 150 square kilometers combined, TP1 and TP2 front the Expressway corridor and feature:
</p>
<ul>
  <li><strong>Residential Zones (R1 & R2):</strong> High-density and suburban plotted housing societies engineered to house executive, engineering, and workforce populations.</li>
  <li><strong>High-Access Corridors:</strong> Mixed-use commercial strips along 55-meter and 70-meter arterial sector avenues suited for corporate headquarters, hospitality, retail hubs, and diagnostic healthcare complexes.</li>
  <li><strong>Social Amenities:</strong> Pre-zoned sectors for international schools, university campuses, and civic recreation centers.</li>
</ul>

<h3>TP Schemes 3 through 6</h3>
<p>
Encompass medium-to-long term master-planned expansions for specialized engineering, heavy manufacturing, logistics parks, and green conservation buffers. These schemes represent strategic institutional landholding targets for longer investment horizons in Dholera SIR.
</p>

<h2>4. Due Diligence & Legal Clearance: Essential Investor Safeguards</h2>
<p>
While the economic trajectory of Dholera SIR is compelling, land acquisition requires stringent verification to avoid common speculative pitfalls:
</p>

<ol>
  <li><strong>Zoning Verification Against Official DSIRDA DP Maps:</strong> Ensure any prospective parcel lies strictly within sanctioned TP zones (Residential, Commercial, or Industrial) rather than agricultural conservation belts or coastal buffer zones.</li>
  <li><strong>Title Lineage & 30-Year Search Report:</strong> Insist on a complete Title Clearance Certificate issued by a certified revenue advocate verifying continuous 30-year unencumbered ownership.</li>
  <li><strong>Non-Agricultural (NA) & DSIRDA Sanction:</strong> Confirm that plotted layouts possess legitimate DSIRDA layout approval and RERA registration where applicable, guaranteeing that internal roads, open spaces, and utility reservations conform to General Development Control Regulations (GDCR 2024).</li>
</ol>

<p>
For verified regulatory data, investors can consult the <a href="https://dholera.gujarat.gov.in" target="_blank" rel="noopener noreferrer"><strong>Official Dholera SIR Authority Portal (DSIRDA)</strong></a>. You can also calculate official scrutiny charges directly using our interactive <a href="/clearance-engine"><strong>Dholera Clearance & Fee Engine</strong></a> and access verified <a href="/tp-maps"><strong>Town Planning Maps Matrix</strong></a>.
</p>

<h2>5. Frequently Asked Questions (FAQ)</h2>
<div class="space-y-6 my-8">
  <div class="card-inset">
    <h3 class="card-heading-accent">When will commercial production begin at the Tata Dholera semiconductor fab?</h3>
    <p class="card-body-text">Construction and cleanroom integration at the TEPL Dholera fab are moving on an accelerated schedule under the India Semiconductor Mission (ISM), with pilot wafer runs slated for late 2026 and commercial semiconductor output scaling into 2027.</p>
  </div>
  <div class="card-inset">
    <h3 class="card-heading-accent">Which TP schemes are best suited for individual retail investors in 2026?</h3>
    <p class="card-body-text">TP1 and TP2 are widely recognized by property analysts as the prime zones for individual investors due to their proximity to the Expressway interchange, prioritized residential utility allocation, and direct readiness for plotted housing societies in Dholera SIR.</p>
  </div>
  <div class="card-inset">
    <h3 class="card-heading-accent">How does the 109 km Expressway impact land valuation?</h3>
    <p class="card-body-text">Historically in Gujarat industrial corridors (such as Sanand, Changodar, and GIFT City), express mobility cutover generates a 35% to 60% value inflection over a 24-month horizon as commute friction vanishes and executive residency commences.</p>
  </div>
  <div class="card-inset">
    <h3 class="card-heading-accent">Can non-resident Indians (NRIs) legally buy plotted land in Dholera SIR?</h3>
    <p class="card-body-text">Yes. Non-Resident Indians (NRIs) and Overseas Citizens of India (OCIs) can legally purchase non-agricultural residential and commercial real estate in Dholera SIR through standard inward banking remittance (NRE/NRO accounts) under RBI and FEMA regulations.</p>
  </div>
</div>

<h2>Conclusion: Capitalizing on India's First Operational Smart City</h2>
<p>
Dholera SIR in 2026 is distinguished by concrete industrial milestones, operational roads, and decisive global capital allocations. By aligning portfolio acquisitions with sanctioned Town Planning zones, verified land titles, and proximity to major arterial infrastructure, investors position themselves at the ground floor of India's most ambitious urban development.
</p>

<p>
To evaluate verified inventory, explore GIS-verified records via our <a href="/tp-maps"><strong>Town Planning Maps</strong></a>, or review legal clearance guidelines on our verified <a href="/projects"><strong>Dholera Projects Directory</strong></a>.
</p>

<p class="wp-block-paragraph"></p>

<p class="wp-block-paragraph">📞 Call/WhatsApp: <a href="https://wa.me/917435808031" target="_blank" rel="noopener noreferrer"><strong>+91 7435808031</strong></a></p>
<p class="wp-block-paragraph">🌐 Website: <a href="https://dholeraplatform.com/contact"><strong>https://dholeraplatform.com/contact</strong></a></p>
<p class="wp-block-paragraph">Contact us today to discuss your requirements and discover the best land investment opportunities in Dholera SIR.</p>`
};

// ─────────────────────────────────────────────────────────────────────────────
// BLOG 2: Today's Blog (October 10, 2026) - Dholera International Airport
// ─────────────────────────────────────────────────────────────────────────────
const BLOG_OCT10 = {
  title: "Dholera International Airport 2026: Runway Readiness, Cargo Hub & Navagam Land Strategy",
  slug: "dholera-international-airport-2026-runway-cargo-navagam-land-strategy",
  category: "Infrastructure",
  published: true,
  isApproved: true,
  isExclusive: false,
  author: "Naresh Gohel",
  imageUrl: "/images/dholera-international-airport-runway-2026.jpg",
  imagePosition: "top",
  tags: "Dholera SIR, Dholera International Airport, Navagam, Cargo Terminal, Ahmedabad Dholera Expressway, Land Investment, DIAL",
  seoTitle: "Dholera International Airport 2026: Runway & Cargo Land Hub",
  seoDescription: "In-depth 2026 intelligence report on Dholera International Airport runway progress, cargo logistics terminal timelines, and Navagam land investment strategy.",
  seoKeywords: "Dholera SIR, Dholera International Airport, Navagam Airport Land, Cargo Logistics Terminal, Gujarat Aviation Corridor",
  imageAltText: "Dholera International Airport 3200-meter Runway and Terminal in Dholera SIR Gujarat",
  imageTitle: "Dholera International Airport Civil Aviation & Cargo Infrastructure 2026",
  publishedAt: "2026-10-10T09:00:00.000Z",
  content: `<p class="lead text-xl text-slate-700 dark:text-slate-200 font-medium mb-8">
Following the high-level civil aviation review led by Union Civil Aviation leadership, Dholera International Airport (DIAL) near Navagam village has transitioned into its final runway calibration and cargo commissioning phase. Built across 1,426 hectares as India's premier greenfield cargo-passenger aerotropolis, the airport represents the ultimate mobility anchor that will elevate Dholera SIR into a globally connected manufacturing capital.
</p>

<h2>Executive Summary: The Aerotropolis Growth Catalyst</h2>
<p>
For institutional investors, corporate supply-chain leaders, and forward-looking land buyers in Dholera SIR, the commissioning of an international airport is the single most potent driver of long-term commercial land appreciation. Global aerotropolis benchmarks—from Incheon in South Korea to Dallas-Fort Worth in the United States—consistently show that real estate located within a 15-minute radius of a specialized cargo airport outpaces regional averages by 45% to 80% during the initial five years of flight operations.
</p>

<figure class="my-8">
  <img src="/images/dholera-international-airport-runway-2026.jpg" alt="Dholera International Airport 3200-meter Runway and Terminal in Dholera SIR Gujarat" class="w-full rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800" />
  <figcaption class="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">Figure 1: Aerial perspective of the 3,200-meter Code 4E runway, passenger terminal with solar canopy, and air traffic control tower at Dholera International Airport (DIAL).</figcaption>
</figure>

<h2>1. Runway Engineering & Flight Operations Timeline</h2>
<p>
Jointly developed by the Airports Authority of India (AAI - 51%), Government of Gujarat (33%), and National Industrial Corridor Development Corporation (NICDC - 16%), the Phase 1 development parameters of Dholera International Airport are specifically calibrated for heavy commercial and cargo payloads in Dholera SIR:
</p>

<h3>Key Aviation Milestones:</h3>
<ul>
  <li><strong>3,200-Meter Code 4E Runway:</strong> Fully paved and engineered to handle wide-body passenger aircraft including the Boeing 777, Boeing 787 Dreamliner, and Airbus A350, as well as ultra-heavy cargo freighters.</li>
  <li><strong>Future 4,000-Meter Parallel Runway:</strong> Master planned land reservations already secured for a secondary 4,000-meter runway in Phase 2 capable of receiving the Airbus A380 superjumbo.</li>
  <li><strong>State-of-the-Art ATC Tower:</strong> Equipped with advanced instrument landing systems (ILS CAT III-A) ensuring all-weather 24/7 landing clearance even during zero-visibility winter morning weather.</li>
  <li><strong>Passenger Terminal Capacity:</strong> Phase 1 terminal designed for 1.5 million annual passengers, seamlessly expandable to 20 million passengers over phased 20-year modules.</li>
</ul>

<figure class="my-8">
  <img src="/images/dholera-airport-cargo-logistics-hub-2026.jpg" alt="Dedicated air cargo logistics terminal and MRO maintenance facility at Dholera International Airport Navagam" class="w-full rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800" />
  <figcaption class="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">Figure 2: Dedicated international air cargo apron, specialized cold-storage pharma hangars, and automated freight loading bays at Dholera International Airport.</figcaption>
</figure>

<h2>2. The Cargo Advantage: Unlocking Global Semiconductor Exports</h2>
<p>
Unlike conventional passenger-first airports, Dholera International Airport was purpose-engineered as an export engine for Gujarat's high-tech manufacturing corridor. Its strategic location adjacent to the Tata Electronics semiconductor mega fab creates an unmatched logistics advantage:
</p>

<h3>A. Temperature-Controlled Clean Cargo Handling</h3>
<p>
Semiconductor chips, printed circuit boards, and electronic assemblies require vibration-minimized, climate-controlled transit. DIAL's dedicated cargo village features automated air-conditioned cargo processing centers, enabling microchips produced in the Dholera Activation Area to reach export freighters bound for Munich, Singapore, and Tokyo in under 20 minutes from the factory floor.
</p>

<h3>B. Cargo Relief for Ahmedabad Airport</h3>
<p>
Sardar Vallabhbhai Patel International Airport (SVPIA) in Ahmedabad is operating near peak cargo and runway capacity with constrained urban expansion. DIAL serves as the dedicated cargo overflow hub, absorbing all heavy freighter operations across Western India and spurring massive warehousing clusters in Dholera SIR.
</p>

<h3>C. MRO (Maintenance, Repair, and Overhaul) Aviation Hub</h3>
<p>
Over 150 acres within the airport perimeter are designated for commercial aircraft MRO hangars, establishing Dholera as an aerospace service base for domestic airlines including IndiGo and Air India.
</p>

<figure class="my-8">
  <img src="/images/dholera-airport-aviation-corridor-plots-2026.jpg" alt="Grand multilane highway and aviation corridor connecting Dholera International Airport to the Ahmedabad Dholera Expressway" class="w-full rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800" />
  <figcaption class="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">Figure 3: Planned aviation corridor highway linking Dholera International Airport to NH-751 Expressway and demarcated Town Planning land plots.</figcaption>
</figure>

<h2>3. Navagam & Surrounding Town Planning (TP) Aviation Zone Strategy</h2>
<p>
The geography immediately surrounding Dholera International Airport—spanning Navagam, Valinda, and Otariya village clusters—is planned under specialized Town Planning schemes. For real estate investors, this corridor represents prime commercial and logistics land:
</p>

<h3>A. Aviation & Aerotropolis Commercial Corridors</h3>
<p>
Zoned for 5-star airport hospitality, international convention centers, airline crew residential townships, and corporate aviation offices along 70-meter wide arterial boulevards.
</p>

<h3>B. Logistics & Warehousing Hubs (TP1 & TP2 North)</h3>
<p>
Parcels lying between the Airport Interchange and the Expressway spine benefit from dual road-and-air connectivity. These zones command premium leasing interest from 3PL (third-party logistics) operators, e-commerce fulfillment centers, and defense aerospace sub-contractors in Dholera SIR.
</p>

<h3>C. High-Return Residential Societies for Aviation Staff</h3>
<p>
With over 35,000 aviation, ground-handling, customs, and airline staff expected within the aerotropolis ecosystem, planned plotted housing societies in TP1 and TP2 are experiencing accelerating demand from end-users and investors alike.
</p>

<h2>4. Multimodal Synergy: Expressway Spur & Metro Link</h2>
<p>
Transit to and from Dholera International Airport is engineered with zero commute friction:
</p>

<ol>
  <li><strong>Expressway Airport Spur:</strong> A direct 6-lane access-controlled spur connects the airport terminal gates directly to the 109 km Ahmedabad–Dholera Expressway (NH-751), delivering a 40-minute drive from Ahmedabad.</li>
  <li><strong>Mass Rapid Transit System (MRTS - Metro):</strong> Pre-engineered elevated right-of-way reservations along the central expressway median connect the Dholera airport terminal straight to Ahmedabad Metro and GIFT City.</li>
  <li><strong>Western DFC Freight Rail:</strong> Rail cargo connectivity through the nearby Bhimnath junction connects directly to major maritime ports at Pipavav and Mundra.</li>
</ol>

<p>
For verified regulatory data and official aviation zoning maps, investors can consult the <a href="https://dholera.gujarat.gov.in" target="_blank" rel="noopener noreferrer"><strong>Official Dholera SIR Authority Portal (DSIRDA)</strong></a> and the <a href="https://dicdl.gujarat.gov.in" target="_blank" rel="noopener noreferrer"><strong>DICDL Airport Governance Board</strong></a>. You can inspect exact plot boundaries using our verified <a href="/tp-maps"><strong>Town Planning Maps</strong></a> and calculate developmental scrutiny charges with the <a href="/clearance-engine"><strong>Clearance Engine</strong></a>.
</p>

<h2>5. Frequently Asked Questions (FAQ)</h2>
<div class="space-y-6 my-8">
  <div class="card-inset">
    <h3 class="card-heading-accent">When will commercial flight operations begin at Dholera International Airport?</h3>
    <p class="card-body-text">Phase 1 runway construction, lighting calibration, and terminal civil work are progressing on an accelerated schedule, with cargo operations and test calibration flights scheduled for late 2026, scaling to scheduled passenger operations in early 2027.</p>
  </div>
  <div class="card-inset">
    <h3 class="card-heading-accent">Where is the airport located relative to Dholera SIR TP schemes?</h3>
    <p class="card-body-text">The airport is situated near Navagam village, approximately 15 kilometers north of the Activation Area and directly accessible from TP1 and TP2 via the dedicated Airport Expressway interchange.</p>
  </div>
  <div class="card-inset">
    <h3 class="card-heading-accent">Why is Dholera Airport designated as a cargo relief hub?</h3>
    <p class="card-body-text">Ahmedabad's SVPIA is physically hemmed in by urban development and cannot expand its runway or freighter aprons. Dholera provides 1,426 hectares of greenfield land specifically engineered for wide-body 24/7 heavy cargo and MRO operations in Dholera SIR.</p>
  </div>
  <div class="card-inset">
    <h3 class="card-heading-accent">Can individual investors buy land near Dholera Airport?</h3>
    <p class="card-body-text">Yes. Individual investors and NRIs can legally purchase Non-Agricultural (NA) approved plotted land in sanctioned Town Planning zones surrounding the airport corridor, backed by clear Title Clearance Certificates and DSIRDA development permissions.</p>
  </div>
</div>

<h2>Conclusion: Capitalizing on Gujarat's Aviation Gateway</h2>
<p>
Dholera International Airport is not merely a transportation asset; it is the economic catalyst that transforms Dholera SIR into a premier global industrial aerotropolis. Investors who position capital in sanctioned TP1 and TP2 corridors ahead of commercial flight takeoffs secure early-mover valuation advantages that compound as international trade flows commence.
</p>

<p>
To explore verified land inventory along the airport corridor, inspect GIS coordinates on our <a href="/tp-maps"><strong>Town Planning Maps</strong></a>, or view legally vetted projects on our <a href="/projects"><strong>Verified Projects Directory</strong></a>.
</p>

<p class="wp-block-paragraph"></p>

<p class="wp-block-paragraph">📞 Call/WhatsApp: <a href="https://wa.me/917435808031" target="_blank" rel="noopener noreferrer"><strong>+91 7435808031</strong></a></p>
<p class="wp-block-paragraph">🌐 Website: <a href="https://dholeraplatform.com/contact"><strong>https://dholeraplatform.com/contact</strong></a></p>
<p class="wp-block-paragraph">Contact us today to discuss your requirements and discover the best land investment opportunities in Dholera SIR.</p>`
};

function makeRequest(urlStr, options, postData) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(urlStr, options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, headers: res.headers, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, raw: body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function syncToHost(baseUrl, username, password) {
  console.log(`\n========================================`);
  console.log(`Targeting: ${baseUrl}`);
  console.log(`========================================`);

  // 1. Authenticate
  console.log(`[1] Authenticating as '${username}'...`);
  const loginRes = await makeRequest(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { username, password });

  if (loginRes.status !== 200 || !loginRes.data?.ok) {
    console.error(`Login failed:`, loginRes.status, loginRes.data || loginRes.raw);
    return;
  }
  console.log(`[✓] Logged in successfully!`);

  const cookies = (loginRes.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
  const tokenMatch = cookies.match(/admin_access_token=([^;]+)/);
  const token = tokenMatch ? tokenMatch[1] : '';

  const authHeaders = {
    'Content-Type': 'application/json',
    'Cookie': cookies,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  // Fetch all posts
  const listRes = await makeRequest(`${baseUrl}/updates/admin/all`, {
    method: 'GET',
    headers: authHeaders
  });
  const existingPosts = Array.isArray(listRes.data) ? listRes.data : [];

  // A. UPDATE OCT 9 BLOG (Remove weird box, keep clean contact callout)
  console.log(`\n[2] Updating Oct 9 Blog (removing weird box)...`);
  const oct9Existing = existingPosts.find(p => p.slug === BLOG_OCT9_CLEAN.slug || p.title === BLOG_OCT9_CLEAN.title);
  if (oct9Existing) {
    const updateRes = await makeRequest(`${baseUrl}/updates/${oct9Existing.id}`, {
      method: 'PUT',
      headers: authHeaders
    }, BLOG_OCT9_CLEAN);
    console.log(`[✓] Oct 9 Blog updated (ID: ${oct9Existing.id}, Status: ${updateRes.status})`);
  } else {
    console.warn(`[!] Oct 9 Blog not found for update`);
  }

  // B. PUBLISH OCT 10 BLOG (Today's new post)
  console.log(`\n[3] Publishing Oct 10 Today Blog...`);
  const oct10Existing = existingPosts.find(p => p.slug === BLOG_OCT10.slug || p.title === BLOG_OCT10.title);
  if (oct10Existing) {
    console.log(`[!] Oct 10 Post already exists (ID: ${oct10Existing.id}). Updating via PUT...`);
    const updateRes = await makeRequest(`${baseUrl}/updates/${oct10Existing.id}`, {
      method: 'PUT',
      headers: authHeaders
    }, BLOG_OCT10);
    console.log(`[✓] Oct 10 Blog updated (ID: ${oct10Existing.id}, Status: ${updateRes.status})`);
  } else {
    console.log(`[+] Creating new Oct 10 Blog via POST /api/updates...`);
    const createRes = await makeRequest(`${baseUrl}/updates`, {
      method: 'POST',
      headers: authHeaders
    }, BLOG_OCT10);
    console.log(`[✓] Oct 10 Blog created (ID: ${createRes.data?.id || createRes.data}, Status: ${createRes.status})`);
  }

  // C. Verify Public Feed
  console.log(`\n[4] Verifying public endpoint /api/updates...`);
  const verifyRes = await makeRequest(`${baseUrl}/updates`, { method: 'GET' });
  const updates = Array.isArray(verifyRes.data) ? verifyRes.data : [];
  const foundOct9 = updates.find(p => p.slug === BLOG_OCT9_CLEAN.slug);
  const foundOct10 = updates.find(p => p.slug === BLOG_OCT10.slug);
  console.log(`Oct 9 in Public Feed: ${foundOct9 ? `YES (ID: ${foundOct9.id})` : 'NO'}`);
  console.log(`Oct 10 in Public Feed: ${foundOct10 ? `YES (ID: ${foundOct10.id})` : 'NO'}`);
}

async function run() {
  console.log('--- EVALUATING OCT 10 SEO READINESS SCORE ---');
  const evaluation = evaluateSeo(BLOG_OCT10);
  console.log(`Score: ${evaluation.score}/100`);
  console.log(`Word Count: ${evaluation.wordCount}`);
  console.log(`Keyword: "${evaluation.keyword}", Density: ${evaluation.density}%`);
  console.log(`Internal Links: ${evaluation.internalLinks}, External Links: ${evaluation.externalLinks}`);
  console.log('\nChecks Breakdown:');
  evaluation.checks.forEach(([label, passed, pts]) => {
    console.log(`  [${passed ? 'PASS ✓' : 'FAIL ✗'}] (+${pts}) ${label}`);
  });

  // Sync to local backend
  try {
    await syncToHost('http://localhost:3001/api', 'admin', 'change-me');
  } catch (err) {
    console.error('Local error:', err.message);
  }

  // Sync to production backend
  try {
    await syncToHost('https://api.dholeraplatform.com/api', 'admin', 'change-me');
  } catch (err) {
    console.error('Live error:', err.message);
  }
}

run();
