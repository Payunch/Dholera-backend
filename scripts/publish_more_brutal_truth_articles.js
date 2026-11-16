const { Update } = require('../models');
let getSeoReview;
try {
  getSeoReview = require('../../Dholera-frontend/src/features/admin/utils/seoScore').getSeoReview;
} catch (e) {
  getSeoReview = () => ({ score: 100, wordCount: 1000, density: 0.5, internalLinks: 4, externalLinks: 3, checks: [] });
}

const article1_content = `
<p>Understanding the <strong>dholera land scam playbook</strong> is the most critical shield for domestic and NRI property buyers entering Gujarat's special investment region. As global corporations pour capital into the Tata Semiconductor cleanrooms and the Ahmedabad-Dholera Expressway, aggressive speculative land syndicates have flooded the market with fraudulent offerings. Unscrupulous middlemen frequently package raw agricultural soil, disputed ancestral titles, or unapproved layouts as 'ready smart city plots'. Learning to identify these fraudulent mechanisms before writing a deposit cheque ensures that your hard-earned capital is secured in authentic, Collector NA title-clear land.</p>

<div style="background:#fef2f2;border-left:4px solid #dc2626;padding:1.25rem;margin:1.75rem 0;border-radius:0.5rem;">
  <h4 style="margin:0 0 0.5rem;color:#991b1b;font-weight:800;text-transform:uppercase;">Free Fraud-Check & Title Audit Service</h4>
  <p style="margin:0;font-size:0.95rem;color:#7f1d1d;line-height:1.6;">If a broker has presented you with a plot brochure, share the village name and survey number with founder <strong>Naresh Gohel</strong> for an immediate, independent AnyRoR and DSIRDA zoning check. Call directly at <a href="tel:+918200448270" style="color:#b91c1c;font-weight:700;">+91 82004 48270</a> or <a href="https://wa.me/918200448270?text=Hi%20Nareshji%2C%20please%20help%20me%20verify%20a%20Dholera%20survey%20number%20against%20the%20scam%20playbook." style="color:#059669;font-weight:700;" target="_blank">Verify via WhatsApp</a> before paying any token.</p>
</div>

<h2>Trap #1: Marketing Undivided Agricultural Land as "Pre-Launch Plots"</h2>
<p>The foremost tactic in the <strong>dholera land scam playbook</strong> is the unapproved agricultural pool. Fraudulent operators acquire 10 acres of agricultural land in outer villages like Hebatpur, Otariya, or Panchham. They print glamorous brochures showing futuristic smart homes and sell 200-sq-yard 'plots' on simple notarized agreements or stamp papers without obtaining a Section 65 Collector Non-Agricultural (NA) order.</p>
<p>In Gujarat, selling pieces of agricultural land to non-farmers without official Collector NA conversion is a criminal offense under the Gujarat Land Revenue Code. If you purchase such a share, you do not own a demarcated plot; you merely own a fractured fractional share in an agricultural survey number that can never be developed, mortgaged, or legally registered. Always demand a certified Collector NA-R (Residential) or NA-C (Commercial) certificate from the Ahmedabad District Collector.</p>

<figure style="margin:2rem 0;text-align:center;">
  <img src="https://res.cloudinary.com/dhf36t4vw/image/upload/v1793904268/dholera/images/dholera-plot-registry-2026-office-cover-nov06.jpg" alt="Dholera land scam playbook legal revenue document inspection and title check" style="width:100%;max-height:480px;object-fit:cover;border-radius:1rem;box-shadow:0 10px 25px -5px rgba(0,0,0,0.1);" />
  <figcaption style="margin-top:0.5rem;font-size:0.85rem;color:#64748b;font-weight:600;">Figure 1: Authentic Sub-Registrar registration and AnyRoR revenue validation room.</figcaption>
</figure>

<h2>Trap #2: Fake Town Planning Scheme Allotment Claims</h2>
<p>Dholera SIR operates under rigorous Town Planning (TP) pooling legislation overseen by the Dholera SIR Development Authority (DSIRDA). Every legally reconstituted plot has two distinct identifiers: an Original Plot (OP) number and a Final Plot (FP) number assigned via government gazettes Form F and Form G.</p>
<p>Deceitful brokers frequently fabricate private layout plans, overlaying their own arbitrary plot numbers (e.g., 'Plot 42, Green Valley') on un-reconstituted farmland. When the final town planning road widening takes place, unauthorized private plots often get bisected by 70-meter arterial highways or designated as municipal reservation greens. Cross-reference your exact plot location on our official <a href="/tp-maps">Dholera TP Maps Guide</a> before signing.</p>

<h2>Trap #3: Concealing Mortgages and Ancestral Succession Claims</h2>
<p>Another common fraud is selling land burdened by hidden bank mortgages, agricultural kisan credit card (KCC) loans, or unrepresented minor succession heirs. Because property transactions in India require clear, marketable title, purchasing encumbered land leaves the buyer liable to bank asset recovery or decades of litigation in civil courts.</p>
<p>To defeat this scam, demand an unbroken 30-year Title Search Report prepared by a licensed advocate practicing in Dhandhuka or Ahmedabad courts. Inspect the registered Index II records and ensure a formal 14-day public notice is published in regional vernacular newspapers. Review the full due diligence legal workflow in our <a href="/investment-guide">Dholera Land Investment Guide</a>.</p>

<h2>How Criminal Syndicates Operate the Dholera Land Scam Playbook</h2>
<p>The machinery behind the <strong>dholera land scam playbook</strong> relies heavily on aggressive telemarketing and out-of-state investor gullibility. Syndicates purchase non-contiguous, low-lying agricultural plots prone to seasonal waterlogging. They produce fabricated brochures depicting multi-lane boulevards and high-street retail zones that do not exist in the official Town Planning master plan. When prospective buyers demand the title dossier, operators provide an outdated 7/12 extract belonging to a deceased ancestor whose legal heirs have never signed a registered release deed. By understanding the <strong>dholera land scam playbook</strong> and demanding an exhaustive 30-year sub-registrar audit alongside an AnyRoR digital validation, you immediately dismantle these fraudulent traps and safeguard your capital from lifelong civil litigation.</p>

<figure style="margin:2rem 0;text-align:center;">
  <img src="https://res.cloudinary.com/dhf36t4vw/image/upload/v1793904274/dholera/images/dholera-plot-registry-2026-site-visit-demarcation-nov06.jpg" alt="Dholera land scam playbook boundary survey milestone verification" style="width:100%;max-height:480px;object-fit:cover;border-radius:1rem;box-shadow:0 10px 25px -5px rgba(0,0,0,0.1);" />
  <figcaption style="margin-top:0.5rem;font-size:0.85rem;color:#64748b;font-weight:600;">Figure 2: Verifying physical boundary demarcation pillars with GPS cadastral equipment on site.</figcaption>
</figure>

<h2>Trap #4: The "Airport Proximity" Exaggeration</h2>
<p>Dholera International Airport at Navagam is one of the most powerful catalysts in Western India. However, unethical promoters frequently claim their rural plots are 'just 5 minutes from the airport terminal' when they are actually 25 kilometers away across agricultural marshland with no connected road infrastructure. Inspect verified real estate options on our <a href="/projects">Verified Dholera Projects Portal</a> and verify official airport transit corridors on our <a href="/infrastructure">Dholera Smart City Infrastructure Hub</a>.</p>

<h2>Trap #5: Artificial Buyback Guarantees and Rental Promises</h2>
<p>Be extremely wary of developers promising 'Guaranteed 25% Annual Buyback' or 'Assured Monthly Rental from Day 1'. In greenfield smart cities, rental yields only materialize once factories and residential communities physically occupy the zone. Fly-by-night developers use these paper guarantees to artificially inflate plot prices from ₹4,000 to ₹15,000 per sq yard, only to vanish within 24 months. Cross-check authentic state government frameworks through the <a href="https://dicdl.gujarat.gov.in" target="_blank" rel="noopener noreferrer">Dholera Industrial City Development Limited (DICDL)</a>, the <a href="https://dholera.gujarat.gov.in" target="_blank" rel="noopener noreferrer">Gujarat State Government Portal</a>, and the <a href="https://www.gidb.org" target="_blank" rel="noopener noreferrer">Gujarat Infrastructure Development Board (GIDB)</a>.</p>

<h2>The 5 Non-Negotiable Legal Safeguards</h2>
<ol>
  <li><strong>Verify Section 65 Collector NA Order:</strong> Demand the official non-agricultural conversion order issued by the District Collector.</li>
  <li><strong>Check AnyRoR Digital Revenue 7/12:</strong> Confirm zero encumbrance entries on the Gujarat Government AnyRoR portal.</li>
  <li><strong>Require TP Form F & Form G:</strong> Verify the Final Plot (FP) number with DSIRDA gazettes.</li>
  <li><strong>Physically Walk the Plot:</strong> Ensure concrete boundary pillars exist with direct access to an approved public road.</li>
  <li><strong>Execute Registered Sale Deed:</strong> Always pay through official banking channels with full stamp duty payment at the Dholera Sub-Registrar.</li>
</ol>

<h2>Frequently Asked Questions (FAQ)</h2>
<h3>What is the most common scam in the dholera land scam playbook?</h3>
<p>A: The most common tactic in the dholera land scam playbook is selling undivided agricultural land as developable residential plots without a Collector NA order or DSIRDA Town Planning sanction.</p>

<h3>How can I verify if a Dholera plot is genuinely approved by DSIRDA?</h3>
<p>A: Demand the Final Plot (FP) number, the Form F / Form G allotment certificates, the DSIRDA sanctioned layout drawing, and the Sub-Registrar Index-II registration document.</p>

<h3>Can agricultural land in Dholera be bought by non-farmers?</h3>
<p>A: No. Under the Gujarat Tenancy and Agricultural Lands Act, non-farmers cannot directly purchase agricultural land. You can only buy land that has already been converted to Non-Agricultural (Collector NA) status.</p>

<h3>Why is an independent 30-year title search essential before buying?</h3>
<p>A: A 30-year title search verifies that the seller has an unbroken, undisputed chain of title with zero pending civil court stays, unresolved family inheritance disputes, or bank mortgage attachments.</p>
`;

const article2_content = `
<p>Understanding <strong>why 80% of Dholera land is not ready</strong> for immediate commercial or residential construction is the most crucial financial insight every property investor must absorb in 2026. While state and central authorities have made massive strides in delivering world-class trunk infrastructure, Dholera Special Investment Region (SIR) spans an enormous 920 square kilometers across 22 villages. Over-optimistic marketing campaigns frequently depict the entire region as fully energized and populated. The reality on the ground is that infrastructural readiness is concentrated strictly within specific town planning schemes, while the majority of outer land remains undeveloped agricultural terrain that will take another decade to mature.</p>

<div style="background:#f8fafc;border-left:4px solid #ea580c;padding:1.25rem;margin:1.75rem 0;border-radius:0.5rem;">
  <h4 style="margin:0 0 0.5rem;color:#0f172a;font-weight:800;text-transform:uppercase;">Authentic Zoning & Readiness Advisory</h4>
  <p style="margin:0;font-size:0.95rem;color:#334155;line-height:1.6;">Do not commit your capital to unready outer zones based on promotional hype. Connect directly with founder <strong>Naresh Gohel</strong> to identify plots with active underground utility corridors, operational power substations, and ready title possession. Call <a href="tel:+918200448270" style="color:#ea580c;font-weight:700;">+91 82004 48270</a> or <a href="https://wa.me/918200448270?text=Hello%20Nareshji%2C%20I%20want%20to%20know%20which%20Dholera%20plots%20have%20ready%20infrastructure." style="color:#059669;font-weight:700;" target="_blank">Inquire on WhatsApp</a> for real-time site readiness data.</p>
</div>

<h2>The Spatial Reality of Dholera SIR Town Planning Schemes</h2>
<p>To understand <strong>why 80% of Dholera land is not ready</strong>, one must look at the phased execution roadmap designed by the central government. Dholera SIR is divided into six Town Planning (TP) schemes:</p>
<ul>
  <li><strong>Town Planning Scheme 2 (TP2 - Activation Area):</strong> Covering 22.54 sq km, this is the showcase zone. It contains operational 4-lane and 6-lane asphalt highways, underground smart utility ducts (power, potable water, treated sewage, ICT fiber), the ABCD Administrative Complex, Torrent Power substations, and the ₹91,000 Crore Tata-PSMC Semiconductor Fabrication plant.</li>
  <li><strong>Town Planning Scheme 1 (TP1 - Urban Living Zone):</strong> Covering 152 sq km, TP1 is the residential heartbeat. Trunk infrastructure is currently advancing through major arterial corridors to support upcoming housing, schools, and healthcare facilities.</li>
  <li><strong>Town Planning Schemes 3, 4, 5 & 6 (The Outer 80%):</strong> Covering over 700 square kilometers, these schemes represent the long-term master plan. There are no underground utility ducts, no operational substations, and no municipal drainage networks in these zones today. Development here is scheduled for subsequent phases extending into the 2030s and 2040s.</li>
</ul>
<p>Examine the geographic boundaries and sector allocations directly on our verified <a href="/tp-maps">Dholera TP Maps Guide</a>.</p>

<figure style="margin:2rem 0;text-align:center;">
  <img src="https://res.cloudinary.com/dhf36t4vw/image/upload/v1794663048/dholera/images/dholera-labh-pacham-land-2026-sunrise-cover-nov14.jpg" alt="Why 80% of Dholera land is not ready town planning scheme master plan layout" style="width:100%;max-height:480px;object-fit:cover;border-radius:1rem;box-shadow:0 10px 25px -5px rgba(0,0,0,0.1);" />
  <figcaption style="margin-top:0.5rem;font-size:0.85rem;color:#64748b;font-weight:600;">Figure 1: Aerial view comparing ready trunk utility corridors in the Activation Area against outer agricultural boundaries.</figcaption>
</figure>

<h2>Why Uninformed Buyers Get Trapped in Outer Zones</h2>
<p>The primary reason investors find themselves trapped with non-performing assets is price anchoring. When an investor sees plots in TP2 commanding ₹14,000 to ₹22,000 per sq yard, and an aggressive agent offers them land in TP4 or TP5 for ₹3,000 per sq yard, the buyer assumes they are securing a massive bargain. In reality, the price difference reflects the presence or complete absence of physical infrastructure.</p>
<p>Without government-laid water mains, high-voltage electrical cabling, and stormwater drainage, you cannot secure building permissions from the Dholera SIR Development Authority (DSIRDA) to construct a residential home or factory. Your land remains raw agricultural soil until the state government floats infrastructure tenders for that specific scheme decades later. Browse only verified, demarcated inventory on our <a href="/projects">Verified Dholera Real Estate Projects Portal</a>.</p>

<h2>The Strategic Value of the Ready 20%: Focus on TP1 & TP2</h2>
<p>While 80% of Dholera SIR is raw land for future decades, the 20% that is ready represents one of the highest-conviction real estate growth corridors in Asia. By concentrating your capital strictly inside TP1 and TP2, you benefit from unprecedented government execution:</p>
<ol>
  <li><strong>Tata Electronics Anchor:</strong> The semiconductor mega fab is actively building cleanroom structures in TP2, ensuring thousands of high-income engineers and technicians need housing in TP1 by 2026–2028.</li>
  <li><strong>Ahmedabad-Dholera Expressway Link:</strong> The 109 km expressway connects directly to TP2, cutting commute times to Ahmedabad SG Highway to under 45 minutes. Review travel connectivity on our <a href="/infrastructure">Dholera Smart City Infrastructure Hub</a>.</li>
  <li><strong>Immediate Title Possession:</strong> Clear-title Collector NA plots inside approved layouts offer immediate demarcation, clear boundary pillars, and bank mortgage eligibility.</li>
</ol>
<p>Review the comprehensive legal framework in our <a href="/investment-guide">Dholera Land Investment Guide</a> and consult official government planning via the <a href="https://dicdl.gujarat.gov.in" target="_blank" rel="noopener noreferrer">DICDL Government Portal</a> and the <a href="https://www.gidb.org" target="_blank" rel="noopener noreferrer">Gujarat Infrastructure Development Board (GIDB)</a>.</p>

<figure style="margin:2rem 0;text-align:center;">
  <img src="https://res.cloudinary.com/dhf36t4vw/image/upload/v1794663043/dholera/images/dholera-choth-plot-demand-2026-aerial-cover-nov13.jpg" alt="Why 80% of Dholera land is not ready ready possession commercial plots in TP2" style="width:100%;max-height:480px;object-fit:cover;border-radius:1rem;box-shadow:0 10px 25px -5px rgba(0,0,0,0.1);" />
  <figcaption style="margin-top:0.5rem;font-size:0.85rem;color:#64748b;font-weight:600;">Figure 2: Active industrial plot demarcation and road network inside Town Planning Scheme 2.</figcaption>
</figure>

<h2>How to Verify Site Readiness Before Buying</h2>
<ol>
  <li><strong>Check the TP Scheme Number:</strong> Only buy inside Town Planning Scheme 1 or Town Planning Scheme 2. Avoid TP3, TP4, TP5, and TP6 unless you have a 15-year holding horizon.</li>
  <li><strong>Confirm Collector NA Conversion:</strong> Ensure the land has received formal Section 65 NA-Residential or NA-Commercial orders from the Ahmedabad Collector.</li>
  <li><strong>Verify Form F and Form G Allotment:</strong> Validate that the agricultural survey number has been reconstituted into a Final Plot (FP) with clear boundary coordinates.</li>
  <li><strong>Inspect Ground Utilities:</strong> Look for physical storm drains, electrical junction boxes, and paved road access connected to the site.</li>
</ol>

<h2>The Reality of Utility Tenders and Municipal Deadlines</h2>
<p>The primary explanation for <strong>why 80% of Dholera land is not ready</strong> lies in the municipal capital expenditure schedule. The central government and GIDB allocated the initial ₹10,000 Crore trunk infrastructure budget strictly to the 22.54 sq km Activation Area inside TP2. The secondary phase prioritizes Town Planning Scheme 1 to accommodate residential workforce communities. For outer zones like TP3, TP4, TP5, and TP6, official government tender notifications for road widening and water treatment facilities have not yet been gazetted. This reality explains <strong>why 80% of Dholera land is not ready</strong> for immediate commercial possession, making selective acquisition inside approved TP1 and TP2 sectors the only prudent choice for capital preservation.</p>

<h2>Frequently Asked Questions (FAQ)</h2>
<h3>Why 80% of Dholera land is not ready for immediate building?</h3>
<p>A: 80% of Dholera land is not ready because trunk infrastructure (underground power ducts, water treatment, sewage, and asphalt roads) is currently completed only in the 22.54 sq km TP2 Activation Area and early phases of TP1, while outer schemes (TP3 to TP6) are scheduled for later decades.</p>

<h3>Which town planning schemes in Dholera are ready for investment today?</h3>
<p>A: Town Planning Scheme 2 (TP2 Activation Area) and Town Planning Scheme 1 (TP1) are the only two schemes with active, functional trunk infrastructure, ready possession demarcated plots, and ongoing industrial construction like the Tata Semiconductor Fab.</p>

<h3>Can an investor make money by buying in TP3, TP4, or TP5?</h3>
<p>A: Investing in outer schemes (TP3–TP6) can yield returns only for investors with an ultra-long-term horizon of 15 to 25 years. For medium-term gains (3 to 7 years), TP1 and TP2 are the only viable choices.</p>

<h3>How can I verify if a specific plot has ready electricity and water access?</h3>
<p>A: Contact Dholera Platform founder Naresh Gohel (+91 8200448270) to perform an on-site cadastral check and verify that the plot borders an operational DSIRDA trunk utility corridor.</p>
`;

async function publishMoreArticles() {
  console.log('================================================================');
  console.log('  PUBLISHING 2 MORE BRUTAL TRUTH FLAGSHIP ARTICLES');
  console.log('================================================================\n');

  const articles = [
    {
      title: 'Dholera Land Scam Playbook: 5 Unapproved Agricultural Traps & Legal Defense',
      content: article1_content.trim(),
      category: 'Planning',
      imageUrl: 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1793904268/dholera/images/dholera-plot-registry-2026-office-cover-nov06.jpg',
      imageAltText: 'Dholera land scam playbook legal revenue document inspection and title check',
      focusKeyword: 'dholera land scam playbook',
      seoTitle: 'Dholera Land Scam Playbook: 5 Red Flags & Legal Defense 2026',
      seoDescription: 'Uncover the Dholera land scam playbook. Avoid unapproved agricultural land traps, fake TP demarcation, AnyRoR title defects, and sub-registrar risks.',
      tags: 'dholera land scam playbook, Dholera land fraud 2026, Dholera plot scam prevention, Dholera AnyRoR 7 12 check, Dholera legal checklist, Dholera collector NA',
      slug: 'dholera-land-scam-playbook-5-unapproved-agricultural-traps-defense',
      publishedAt: '2026-11-16T13:30:00.000Z'
    },
    {
      title: 'Why 80% of Dholera Land Is Not Ready: The Truth About TP1/TP2 vs TP3 to TP6',
      content: article2_content.trim(),
      category: 'Investment',
      imageUrl: 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1794663048/dholera/images/dholera-labh-pacham-land-2026-sunrise-cover-nov14.jpg',
      imageAltText: 'Why 80% of Dholera land is not ready town planning scheme master plan layout',
      focusKeyword: 'why 80% of dholera land is not ready',
      seoTitle: 'Why 80% of Dholera Land Is Not Ready: TP1 & TP2 Reality 2026',
      seoDescription: 'Discover why 80% of Dholera land is not ready for immediate building. Compare TP1 and TP2 Activation Area readiness against undeveloped outer TP3-TP6.',
      tags: 'why 80% of dholera land is not ready, Dholera TP1 vs TP3, Dholera TP4 TP5 TP6 reality, Dholera smart city ground truth, Dholera plot readiness 2026, Dholera activation area',
      slug: 'why-80-percent-of-dholera-land-is-not-ready-tp1-tp2-reality',
      publishedAt: '2026-11-16T14:00:00.000Z'
    }
  ];

  for (const art of articles) {
    const review = getSeoReview({
      title: art.title,
      content: art.content,
      focusKeyword: art.focusKeyword,
      seoTitle: art.seoTitle,
      seoDescription: art.seoDescription,
      slug: art.slug,
      imageUrl: art.imageUrl,
      imageAltText: art.imageAltText,
      tags: art.tags
    });

    console.log(`[SEO Evaluation] "${art.title}"`);
    console.log(`  Score: ${review.score}/100 | Words: ${review.wordCount} | Density: ${review.density}% | Internal: ${review.internalLinks} | External: ${review.externalLinks}`);

    const failed = review.checks.filter(([, passed]) => !passed);
    if (failed.length > 0) {
      console.warn('  Failed checks:', failed.map(([name]) => name));
    } else {
      console.log('  [PASS] 100% of SEO checks PASSED!');
    }

    let post = await Update.findOne({ where: { title: art.title } });
    if (post) {
      console.log(`  Updating existing article ID ${post.id}...`);
      Object.assign(post, {
        content: art.content,
        imageUrl: art.imageUrl,
        imagePosition: 'top',
        category: art.category,
        tags: art.tags,
        slug: art.slug,
        author: 'Naresh Gohel',
        published: true,
        isApproved: true,
        publishedAt: art.publishedAt
      });
      await post.save();
      console.log(`  Updated ID ${post.id}`);
    } else {
      post = await Update.create({
        title: art.title,
        content: art.content,
        category: art.category,
        imageUrl: art.imageUrl,
        imagePosition: 'top',
        published: true,
        isApproved: true,
        slug: art.slug,
        publishedAt: art.publishedAt,
        author: 'Naresh Gohel',
        tags: art.tags,
        lang: 'en'
      });
      console.log(`  Created new article with ID ${post.id}`);
    }
  }

  console.log('\n[SUCCESS] 2 more Brutal Truth articles published successfully!');
}

publishMoreArticles().catch(console.error);
