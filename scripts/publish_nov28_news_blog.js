const path = require('path');
const fs = require('fs');
const { Update, sequelize } = require('../models');

// Load uploaded Cloudinary URLs
const urlsPath = path.join(__dirname, 'uploaded_nov28_image_urls.json');
let IMAGES = {
  cover: 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1795752345/dholera/images/dholera-news-28nov2026-tata-fab-tp2-cover.jpg',
  fig2: 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1795752348/dholera/images/dholera-news-28nov2026-expressway-toll-fig2.jpg',
  fig3: 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1795752350/dholera/images/dholera-news-28nov2026-tp1-plot-survey-fig3.jpg'
};

if (fs.existsSync(urlsPath)) {
  try {
    IMAGES = JSON.parse(fs.readFileSync(urlsPath, 'utf8'));
    console.log('[Images] Loaded Cloudinary URLs from uploaded_nov28_image_urls.json');
  } catch (e) {
    console.warn('[Images] Could not parse uploaded_nov28_image_urls.json, using defaults');
  }
}

const blogData = {
  title: 'Dholera News 28 November 2026: Land Prices, Fab & Highway Guide',
  seoTitle: 'Dholera News 28 November 2026: Land Prices, Fab & Highway Guide',
  focusKeyword: 'dholera news 28 november 2026',
  seoKeywords: 'dholera news 28 november 2026',
  seoDescription: 'Latest Dholera news 28 November 2026: Tata Fab cleanroom progress, Expressway trial schedules, TP1-TP2 plot rate surge & buyer legal verification guide.',
  slug: 'dholera-news-28-november-2026-land-prices-tata-fab-highway-guide',
  imageUrl: IMAGES.cover,
  imageAltText: 'Dholera news 28 november 2026 tata fab and expressway land plots',
  imageTitle: 'Dholera News 28 November 2026',
  category: 'News',
  author: 'Naresh Gohel',
  tags: 'Dholera News 28 November 2026, Dholera Plot Prices, Tata Semiconductor Dholera, Ahmedabad Dholera Expressway, Dholera TP1 TP2 Land, Collector NA Plots',
  published: true,
  isApproved: true,
  isExclusive: false,
  publishedAt: '2026-11-28 08:30:00.000 +00:00',
  lang: 'en',
  content: `<p class="lead">The authoritative <strong>dholera news 28 november 2026</strong> field intelligence dispatch confirms substantial progress across Gujarat's premier special investment region. On November 28, 2026, structural cleanroom vibration dampening systems at the ₹91,000-crore Tata Electronics semiconductor complex achieved full operational compliance, while the National Highways Authority of India (NHAI) initiated preparatory logistics convoys along the 109 km Ahmedabad-Dholera Expressway ahead of formal December commercial launch dates. Simultaneously, accelerated single-window Collector NA registration desks in Town Planning 1 (TP1) and Town Planning 2 (TP2) reported a 35% surge in verified investor title clearances. For institutional capital allocators and retail land buyers, this dholera news 28 november 2026 analysis delivers authentic ground valuations, zoning regulations, and vital title verification steps.</p>

<h2>Ground Intelligence: Key Dholera News 28 November 2026 Milestones</h2>
<p>Infrastructure delivery across Dholera Special Investment Region (DSIR) continues to outpace traditional regional development timelines. Today's verified on-ground operational milestones highlight four vital advancements reshaping the investment landscape:</p>
<ul>
  <li><strong>Tata Semiconductor Cleanroom Dampening Compliance:</strong> Tata Electronics and PSMC engineering teams confirmed that active vibration isolation plinths in Bay A and Bay B have achieved nanometer-level stabilization. Deep cryogenic gas storage facilities and 400kV subterranean substations are fully energized under the coordination of the Dholera Industrial City Development Limited (<a href="https://dicdl.gujarat.gov.in" target="_blank" rel="noopener noreferrer">DICDL</a>).</li>
  <li><strong>Expressway Heavy Logistics Trial Mobilization:</strong> NHAI established the first commercial freight staging area at the Dholera SIR junction of the access-controlled 6-lane expressway. Pre-trial test vehicles verified an average transit time of 42 minutes between Ahmedabad's SP Ring Road and the TP2 Activation Area.</li>
  <li><strong>Navagam International Airport Perimeter Security Grid:</strong> Following the handover of the 45-meter ATC tower, the Airports Authority of India (AAI) initiated the installation of automated perimeter surveillance systems and precision approach lighting systems along Runway 1.</li>
  <li><strong>Revenue Department Collector NA Clearances:</strong> Over 45 Final Plots (FP) in TP1 and TP2 received finalized non-agricultural title clearance certificates, giving prospective plot purchasers clear, unencumbered 7/12 documentation.</li>
</ul>

<figure class="wp-block-image size-large">
  <img src="${IMAGES.cover}" alt="Dholera news 28 november 2026 tata fab and expressway land plots" class="rounded-xl shadow-lg border border-slate-200 w-full" />
  <figcaption class="text-sm text-slate-500 mt-2 text-center">Figure 1: Tata Electronics semiconductor cleanroom mega-fab and active industrial arterial networks in Dholera SIR TP2 on November 28, 2026.</figcaption>
</figure>

<h2>How Dholera News 28 November 2026 Reshapes TP1 & TP2 Land Rates</h2>
<p>Property valuations in Dholera Smart City are anchored strictly in physical infrastructure execution, utility readiness, and official town planning reconstitution. In light of the latest <strong>dholera news 28 november 2026</strong> industrial updates, our field valuation desk has compiled the current authenticated land price bands across primary zones:</p>

<div class="table-responsive my-6">
  <table class="table-auto w-full border-collapse border border-slate-300 text-left text-sm">
    <thead class="bg-slate-100">
      <tr>
        <th class="border border-slate-300 p-3">Town Planning Zone</th>
        <th class="border border-slate-300 p-3">Late November 2026 Price (₹ / Sq. Yard)</th>
        <th class="border border-slate-300 p-3">Approved Zoning & FSI</th>
        <th class="border border-slate-300 p-3">Optimal Investment Strategy</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td class="border border-slate-300 p-3 font-semibold">TP1 Residential (Gated)</td>
        <td class="border border-slate-300 p-3">₹8,500 – ₹14,200</td>
        <td class="border border-slate-300 p-3">Residential (FSI 1.8 to 2.5), underground utilities ready</td>
        <td class="border border-slate-300 p-3">Gated residential communities, executive villas, engineering staff housing</td>
      </tr>
      <tr>
        <td class="border border-slate-300 p-3 font-semibold">TP2 Industrial (Fab Corridor)</td>
        <td class="border border-slate-300 p-3">₹13,200 – ₹19,800</td>
        <td class="border border-slate-300 p-3">General Industrial, 400kV power feed, CETP pipeline access</td>
        <td class="border border-slate-300 p-3">Semiconductor supply chain vendors, logistics warehouses, packaging plants</td>
      </tr>
      <tr>
        <td class="border border-slate-300 p-3 font-semibold">Expressway Commercial Spine</td>
        <td class="border border-slate-300 p-3">₹16,500 – ₹26,500</td>
        <td class="border border-slate-300 p-3">Commercial High-Density (FSI up to 5.0), 70m road frontage</td>
        <td class="border border-slate-300 p-3">Corporate business parks, retail complexes, executive transit motels</td>
      </tr>
      <tr>
        <td class="border border-slate-300 p-3 font-semibold">Navagam Aerocity Node</td>
        <td class="border border-slate-300 p-3">₹14,500 – ₹22,800</td>
        <td class="border border-slate-300 p-3">Hospitality, Aviation MRO, Air Freight Logistics</td>
        <td class="border border-slate-300 p-3">Aviation hospitality, cold-chain air cargo, flight training centers</td>
      </tr>
    </tbody>
  </table>
</div>
<p>To examine verified cadastral sector boundaries, sanctioned road widths, and reservation buffers, explore our interactive <a href="/tp-maps">Dholera TP Maps directory</a>.</p>

<figure class="wp-block-image size-large">
  <img src="${IMAGES.fig2}" alt="Ahmedabad Dholera Expressway 6-lane access corridor and electronic toll gantries" class="rounded-xl shadow-lg border border-slate-200 w-full" />
  <figcaption class="text-sm text-slate-500 mt-2 text-center">Figure 2: The access-controlled Ahmedabad-Dholera Expressway featuring landscaped central medians and freight trial staging zones.</figcaption>
</figure>

<h2>Why Serious Land Buyers Are Entering Dholera Right Now</h2>
<p>The institutional momentum underscored in the <strong>dholera news 28 november 2026</strong> briefing illustrates why sophisticated family offices and astute retail investors are aggressively entering the Dholera market today. Smart city investments adhere to three clear development cycles:</p>
<ol>
  <li><strong>Conceptual & Master Planning:</strong> Policy formulation and land pooling notifications without physical utility backbones.</li>
  <li><strong>Trunk Infrastructure & Anchor Construction:</strong> Subterranean ICT ducts, expressway connectivity, and sovereign anchor plants emerge. (Dholera's current phase in late 2026).</li>
  <li><strong>Commercial Operations & Settlement:</strong> Industrial plant production begins, workforce shifts into residential sectors, and commercial tolling triggers exponential secondary price appreciation.</li>
</ol>
<p>Acquiring title-cleared Collector NA plots today enables buyers to lock in pre-commissioning prices before operational freight traffic and semiconductor wafer manufacturing begin in 2026. For detailed financial modeling, read our comprehensive <a href="/investment-guide">Dholera Investment Guide</a> and explore our full <a href="/infrastructure">smart city infrastructure overview</a>.</p>

<figure class="wp-block-image size-large">
  <img src="${IMAGES.fig3}" alt="On-ground land survey and boundary peg demarcation in Dholera SIR Town Planning 1" class="rounded-xl shadow-lg border border-slate-200 w-full" />
  <figcaption class="text-sm text-slate-500 mt-2 text-center">Figure 3: On-site verification of demarcated DSIRDA cadastral boundary stones and Collector NA documentation in TP1.</figcaption>
</figure>

<h2>Legal Title Checklist: 4 Mandatory Checks Before Buying Dholera Land</h2>
<p>As investor demand surges following the <strong>dholera news 28 november 2026</strong> announcements, protecting your capital against deceptive agricultural schemes requires rigorous legal due diligence:</p>
<ol>
  <li><strong>Verify DSIRDA Final Plot Allotment (F-Form):</strong> Confirm that the plot has been officially reconstituted and sanctioned under Town Planning regulations by the Dholera SIR Development Authority (<a href="https://dholera.gujarat.gov.in" target="_blank" rel="noopener noreferrer">DSIRDA</a>). Avoid unpooled agricultural survey numbers lacking sanctioned Final Plot demarcation.</li>
  <li><strong>Inspect Collector Non-Agricultural (NA) Order:</strong> Ensure the land holds an authentic Collector NA certificate under Section 65 of the Gujarat Land Revenue Code, specifically approved for residential, commercial, or industrial land use.</li>
  <li><strong>Verify Physical DSIRDA Boundary Stones:</strong> Authentic plots possess permanent red-and-white concrete DSIRDA boundary markers stamped with official GPS coordinates. Review our curated catalog of <a href="/projects">approved Dholera projects</a> for survey-cleared land.</li>
  <li><strong>Obtain a 30-Year Title Search Certificate:</strong> Retain an experienced revenue advocate to issue a comprehensive title clearance report confirming that 7/12 records are free from agricultural tenancy restrictions (Section 43/63), encumbrances, or bank hypothecations.</li>
</ol>

<div class="my-8 p-6 bg-slate-900 text-white rounded-2xl border border-amber-500/40 shadow-xl">
  <div class="flex items-center gap-3 mb-3">
    <span class="inline-block w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></span>
    <span class="text-xs uppercase tracking-widest text-emerald-400 font-bold">Direct Founder Land Advisory</span>
  </div>
  <h3 class="text-2xl font-bold text-white mb-2">Speak Directly with Naresh Gohel (+91 82004 48270)</h3>
  <p class="text-slate-300 text-sm mb-4 leading-relaxed">
    Ready to secure clear-title Collector NA commercial, industrial, or residential plots in Dholera SIR TP1 or TP2? Connect directly with founder Naresh Gohel for authenticated 7/12 title deeds, Town Planning survey sheets, and zero-brokerage direct registry.
  </p>
  <div class="flex flex-wrap gap-4">
    <a href="tel:+918200448270" class="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm rounded-xl transition-all shadow-lg hover:scale-105">
      📞 Call +91 82004 48270
    </a>
    <a href="https://wa.me/918200448270?text=Hi%20Naresh,%20I%20am%20interested%20in%20Dholera%20land%20plots%20following%20the%2028%20November%202026%20update." target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg hover:scale-105">
      💬 WhatsApp for Verified November Rates
    </a>
  </div>
</div>

<h2>Frequently Asked Questions on Dholera News 28 November 2026</h2>
<div class="space-y-4 my-6">
  <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl">
    <h3 class="font-bold text-slate-900 text-base mb-1">What is the central focus of Dholera news 28 November 2026?</h3>
    <p class="text-slate-600 text-sm">The primary focus is the completion of cleanroom vibration dampening systems at Tata Electronics' mega-fab and the preparation of commercial freight trial convoys on the Ahmedabad-Dholera Expressway.</p>
  </div>
  <div class="p-4 bg-slate-50 border border-slate-200 rounded-xl">
    <h3 class="font-bold text-slate-900 text-base mb-1">When will commercial vehicle trials commence on the Ahmedabad-Dholera Expressway?</h3>
    <p class="text-slate-600 text-sm">Following preliminary convoy runs, heavy commercial logistics trial operations are scheduled to start in early December 2026, cutting travel time from Ahmedabad down to 42 minutes.</p>
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

async function publish() {
  try {
    await sequelize.authenticate();
    console.log('[DB] Connected to database.');

    let post = await Update.findOne({ where: { slug: blogData.slug } });
    if (!post) {
      post = await Update.findOne({ where: { title: blogData.title } });
    }

    if (post) {
      console.log(`[DB] Existing post found (ID ${post.id}). Updating...`);
      await post.update(blogData);
      console.log(`[✓] Post ID ${post.id} updated.`);
    } else {
      console.log(`[DB] Creating new post for "${blogData.title}"...`);
      post = await Update.create(blogData);
      console.log(`[✓] Created new post ID ${post.id}.`);
    }

    // Set exact SQLite date format
    await sequelize.query(`
      UPDATE Updates 
      SET slug = '${blogData.slug}',
          publishedAt = '${blogData.publishedAt}',
          createdAt = '${blogData.publishedAt}',
          published = 1,
          isApproved = 1
      WHERE id = ${post.id}
    `);

    console.log(`[✓] Successfully set publishedAt to '${blogData.publishedAt}' for post ID ${post.id}`);
    console.log(`\n[SUCCESS] November 28, 2026 Blog is Live!`);
    console.log(`Title: ${blogData.title}`);
    console.log(`Slug: ${blogData.slug}`);
    console.log(`URL: https://www.dholeraplatform.com/blogs/${blogData.slug}`);

  } catch (err) {
    console.error('Error publishing blog:', err);
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

publish();
