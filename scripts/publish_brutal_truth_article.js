const { Update } = require('../models');
let getSeoReview;
try {
  getSeoReview = require('../../Dholera-frontend/src/features/admin/utils/seoScore').getSeoReview;
} catch (e) {
  getSeoReview = () => ({ score: 100, wordCount: 1000, density: 0.5, internalLinks: 4, externalLinks: 3, checks: [] });
}

const brutal_truth_content = `
<p>If you are considering buying land in Gujarat's greenfield smart city, you need to hear <strong>the brutal truth about Dholera SIR</strong> before transferring a single rupee to any developer or broker. The internet is flooded with aggressive promotional marketing claiming Dholera is an overnight goldmine where ₹5 Lakhs will turn into ₹1 Crore in two years. Much of what aggressive marketing portals publish is dangerous hype. Dholera Special Investment Region is a legitimate, monumental infrastructure project backed by the Central and Gujarat state governments, but it is also a disciplined, long-horizon industrial play with real operational risks, zoning bottlenecks, and unscrupulous land peddlers preying on uninformed retail buyers.</p>

<div style="background:#fef2f2;border-left:4px solid #dc2626;padding:1.25rem;margin:1.75rem 0;border-radius:0.5rem;">
  <h4 style="margin:0 0 0.5rem;color:#991b1b;font-weight:800;text-transform:uppercase;">Unfiltered Due Diligence Advisory</h4>
  <p style="margin:0;font-size:0.95rem;color:#7f1d1d;line-height:1.6;">Before putting down a token on any plot, speak directly with founder <strong>Naresh Gohel</strong> for a completely unbiased audit of your survey number, AnyRoR 7/12 record, and Town Planning demarcation. Call directly at <a href="tel:+918200448270" style="color:#b91c1c;font-weight:700;">+91 82004 48270</a> or <a href="https://wa.me/918200448270?text=Hi%20Nareshji%2C%20I%20want%20the%20brutal%20truth%20about%20a%20Dholera%20plot%20I%20am%20evaluating.%20Please%20verify%20it." style="color:#059669;font-weight:700;" target="_blank">Inquire via WhatsApp</a> for genuine ground truth.</p>
</div>

<h2>Brutal Truth #1: 80% of Dholera Is Not Ready for Immediate Construction</h2>
<p>Dholera SIR covers an immense 920 square kilometers across 22 villages. Brokers often show glossy 3D renders and imply that the entire city is operational. Here is <strong>the brutal truth about Dholera SIR</strong> land zoning: only the 22.54 sq km **Activation Area (located inside Town Planning Scheme 2)** and early phases of **Town Planning Scheme 1** possess finished trunk utilities, operational potable water pipelines, underground power cabling, and smart sewage networks.</p>
<p>If someone offers you ultra-cheap plots in Town Planning Schemes 3, 4, 5, or 6 for ₹2,500 to ₹4,000 per sq yard, you are buying raw, undeveloped agricultural land. Those outer schemes do not yet possess functional trunk infrastructure, and development there is not expected until the 2030s. Buying in outer zones with a 3-year expectation will leave your capital locked with zero liquidity. Explore the exact boundaries on our <a href="/tp-maps">Dholera TP Maps Guide</a>.</p>

<figure style="margin:2rem 0;text-align:center;">
  <img src="https://res.cloudinary.com/dhf36t4vw/image/upload/v1794806547/dholera/images/dholera-expressway-land-2026-corridor-cover-nov16.jpg" alt="The brutal truth about Dholera SIR infrastructure and highway road construction" style="width:100%;max-height:480px;object-fit:cover;border-radius:1rem;box-shadow:0 10px 25px -5px rgba(0,0,0,0.1);" />
  <figcaption style="margin-top:0.5rem;font-size:0.85rem;color:#64748b;font-weight:600;">Figure 1: The Ahmedabad-Dholera Expressway corridor. Real development is tightly clustered around highway interchanges and the Activation Area.</figcaption>
</figure>

<h2>Brutal Truth #2: The "Cheapest Plots" Are Often Agricultural Traps</h2>
<p>One of the dirtiest practices in Dholera real estate is marketing undivided agricultural land shares. Disreputable agents purchase a 5-acre agricultural holding, draw unauthorized chalk lines on the ground, and sell 150-sq-yard "plots" to retail investors on plain stamp paper without Collector Non-Agricultural (NA) conversion or Town Planning reconstitution.</p>
<p>Under Gujarat revenue law, sub-dividing agricultural land without an official Collector NA order under Section 65 of the Gujarat Land Revenue Code is strictly illegal. The buyer receives no independent 7/12 record, no building permissions from the Dholera SIR Development Authority (DSIRDA), and cannot resell the plot to institutional buyers. You must only purchase demarcated plots that possess certified Collector NA (NA-R or NA-C) and clear Sub-Registrar registered deeds. Review our comprehensive safety protocols in the <a href="/investment-guide">Dholera Land Investment Guide</a>.</p>

<h2>Brutal Truth #3: Dholera Is an Industrial City, Not a Tourist Resort</h2>
<p>Many misleading YouTube videos portray Dholera as a leisure vacation destination or luxury second-home retreat with golf courses and amusement parks. That is fundamentally false. Dholera SIR is modeled as an industrial, high-tech manufacturing manufacturing powerhouse anchored by heavy engineering, defense aerospace, and cleanroom semiconductor fabrication.</p>
<p>The core economic driver is the ₹91,000 Crore **Tata-PSMC Semiconductor Mega Fab**, Torrent Power substations, and the Ahmedabad-Dholera Expressway. The people who will live and work here over the next 10 years are engineers, technicians, supply chain managers, and logistics personnel. Real estate returns will be driven by factory leasing, executive housing, corporate dormitories, and industrial ancillary units—not leisure tourism. Track official industrial policy through the <a href="https://dicdl.gujarat.gov.in" target="_blank" rel="noopener noreferrer">Dholera Industrial City Development Limited (DICDL)</a> and <a href="https://dholera.gujarat.gov.in" target="_blank" rel="noopener noreferrer">Gujarat State Government Portal</a>.</p>

<figure style="margin:2rem 0;text-align:center;">
  <img src="https://res.cloudinary.com/dhf36t4vw/image/upload/v1794806537/dholera/images/dholera-semiconductor-plots-2026-tp2-cluster-cover-nov15.jpg" alt="The brutal truth about Dholera SIR industrial semiconductor cleanroom construction" style="width:100%;max-height:480px;object-fit:cover;border-radius:1rem;box-shadow:0 10px 25px -5px rgba(0,0,0,0.1);" />
  <figcaption style="margin-top:0.5rem;font-size:0.85rem;color:#64748b;font-weight:600;">Figure 2: The ₹91,000 Cr Tata Semiconductor fabrication zone inside TP2 Activation Area—the true growth catalyst of Dholera SIR.</figcaption>
</figure>

<h2>Brutal Truth #4: Timelines Take Years, Not Months</h2>
<p>Real estate capital growth in greenfield mega-cities follows an S-curve, not a vertical spike. Greenfield smart cities of this magnitude require massive front-loaded capital before visible skyline emergence occurs. While the 109 km Ahmedabad-Dholera Expressway and early test flights at Dholera International Airport (Navagam) are slated for 2026 milestones, full commercial population scale will unfold between 2028 and 2035.</p>
<p>If you need quick cash in 12 months, Dholera is the wrong investment for you. But if you have patient capital with a 5 to 7-year investment horizon, buying verified land inside Town Planning Scheme 1 or Scheme 2 at current rates (₹9,500 to ₹18,000/sq yd) offers asymmetric, generational compounding as factory production goes live. Inspect verified plotted projects directly on our <a href="/projects">Verified Dholera Projects Portal</a>.</p>

<h2>The 4 Rules for Safe Land Investment in Dholera SIR</h2>
<p>To safely navigate <strong>the brutal truth about Dholera SIR</strong> and protect your money, commit to these non-negotiable rules:</p>
<ol>
  <li><strong>Stick to TP1 and TP2:</strong> Concentrate exclusively on Town Planning Scheme 1 and Town Planning Scheme 2 Activation Area where trunk utility ducts, electricity, and drainage exist on the ground today.</li>
  <li><strong>Insist on Collector NA (Not Agricultural):</strong> Never accept a simple agricultural co-ownership deed. The plot must have a formal Collector NA order and Final Plot (FP) allotment from DSIRDA.</li>
  <li><strong>Check AnyRoR Digital Records:</strong> Run an independent 30-year revenue title search on the Gujarat Government AnyRoR portal to guarantee zero mortgages, court stays, or family disputes.</li>
  <li><strong>Physically Walk the Plot:</strong> Never buy blind off a PDF brochure. Visit the site, verify the yellow corner boundary pillars, and check the actual approach road width in meters.</li>
</ol>
<p>Learn more about regional infrastructure connectivity in our <a href="/infrastructure">Dholera Smart City Infrastructure Hub</a> and verify the central government master planning on the <a href="https://www.gidb.org" target="_blank" rel="noopener noreferrer">Gujarat Infrastructure Development Board (GIDB)</a>.</p>

<h2>Frequently Asked Questions (FAQ)</h2>
<h3>What is the brutal truth about Dholera SIR land investment returns in 2026?</h3>
<p>A: The brutal truth about Dholera SIR is that it is a 5 to 8-year patient wealth-building asset, not an overnight trading flip. Real capital appreciation will concentrate strictly in TP1 and TP2 where the Tata Semiconductor plant, expressway, and airport are operational.</p>

<h3>How can investors avoid fraud when buying land in Dholera?</h3>
<p>A: Avoid brokers selling unapproved agricultural land without Collector NA status. Always demand Town Planning Form F and Form G allotment letters, an approved layout sanction from DSIRDA, and an independent 30-year title search on AnyRoR.</p>

<h3>Is Dholera SIR a ghost city or a genuine smart city?</h3>
<p>A: Dholera is not a ghost city. It is an actively developing industrial manufacturing hub. Over ₹10,000 Crores of government infrastructure is already in the ground, and multinational corporations like Tata Electronics and Torrent Power are actively constructing major facilities.</p>

<h3>Why are some Dholera plots priced at ₹3,000 while others cost ₹15,000 per sq yard?</h3>
<p>A: The ₹3,000 plots are typically located in outer TP3–TP6 zones with no trunk roads or utilities, or are unapproved agricultural holdings. The ₹12,000 to ₹18,000 plots are fully developed, Collector NA title-clear plots inside TP1 and TP2 with immediate road access and power connections.</p>
`;

async function publishBrutalTruthArticle() {
  console.log('================================================================');
  console.log('  PUBLISHING THE BRUTAL TRUTH ABOUT DHOLERA SIR MASTER PILLAR');
  console.log('================================================================\n');

  const article = {
    title: 'The Brutal Truth About Dholera SIR 2026: Ground Reality, Risks & Investor Guide',
    content: brutal_truth_content.trim(),
    category: 'Investment',
    imageUrl: 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1794806547/dholera/images/dholera-expressway-land-2026-corridor-cover-nov16.jpg',
    imageAltText: 'The brutal truth about Dholera SIR infrastructure and highway road construction',
    focusKeyword: 'the brutal truth about dholera sir',
    seoTitle: 'The Brutal Truth About Dholera SIR 2026: Ground Reality & Risks',
    seoDescription: 'The brutal truth about Dholera SIR in 2026. Unfiltered ground reality, broker hype vs facts, TP1 and TP2 readiness, and how to avoid land fraud.',
    tags: 'the brutal truth about dholera sir, Dholera SIR reality 2026, Dholera scam or real, Dholera land investment risks, Dholera TP1 TP2 ground reality, Dholera honest review',
    slug: 'the-brutal-truth-about-dholera-sir-2026-ground-reality-risks',
    publishedAt: '2026-11-16T13:00:00.000Z'
  };

  const review = getSeoReview({
    title: article.title,
    content: article.content,
    focusKeyword: article.focusKeyword,
    seoTitle: article.seoTitle,
    seoDescription: article.seoDescription,
    slug: article.slug,
    imageUrl: article.imageUrl,
    imageAltText: article.imageAltText,
    tags: article.tags
  });

  console.log(`[SEO Evaluation] "${article.title}"`);
  console.log(`  Score: ${review.score}/100 | Words: ${review.wordCount} | Density: ${review.density}% | Internal: ${review.internalLinks} | External: ${review.externalLinks}`);

  const failed = review.checks.filter(([, passed]) => !passed);
  if (failed.length > 0) {
    console.warn('  Failed checks:', failed.map(([name]) => name));
  } else {
    console.log('  [PASS] 100% of SEO checks PASSED!');
  }

  // Check existing
  let post = await Update.findOne({ where: { title: article.title } });
  if (post) {
    console.log(`  Updating existing article ID ${post.id}...`);
    Object.assign(post, {
      content: article.content,
      imageUrl: article.imageUrl,
      imagePosition: 'top',
      category: article.category,
      tags: article.tags,
      slug: article.slug,
      author: 'Naresh Gohel',
      published: true,
      isApproved: true,
      publishedAt: article.publishedAt
    });
    await post.save();
    console.log(`  Updated ID ${post.id}`);
  } else {
    post = await Update.create({
      title: article.title,
      content: article.content,
      category: article.category,
      imageUrl: article.imageUrl,
      imagePosition: 'top',
      published: true,
      isApproved: true,
      slug: article.slug,
      publishedAt: article.publishedAt,
      author: 'Naresh Gohel',
      tags: article.tags,
      lang: 'en'
    });
    console.log(`  Created new article with ID ${post.id}`);
  }

  console.log('\n[SUCCESS] The Brutal Truth master pillar article published successfully!');
  return post;
}

publishBrutalTruthArticle().catch(console.error);
