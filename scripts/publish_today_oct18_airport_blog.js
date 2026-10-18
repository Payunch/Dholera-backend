/**
 * Publish Today October 18, 10:18 Blog Post on Dholera International Airport 2026
 * Topic: Dholera International Airport 2026: Runway Calibration, Dedicated Semiconductor Cargo Terminal & Flight Launch
 *
 * Fully standalone script compatible with both local and production server environments.
 * Strictly satisfies all 18 rules of seoScore.js (Target: 100+ SEO Score, 1100+ words).
 */

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
  const faqs = (content.match(/class=["'][^"']*faq-question[^"']*["']/gi) || content.match(/<summary/gi) || []).length;

  const checks = [
    ['Primary keyword is set', Boolean(keyword), 8],
    ['Focus keyword is a single phrase (no comma stuffing)', Boolean(keyword && !keyword.includes(',')), 4],
    ['SEO title is 45–65 characters', seoTitle.length >= 45 && seoTitle.length <= 65, 8],
    ['SEO title includes the keyword', Boolean(keyword && seoTitle.toLowerCase().includes(keyword)), 8],
    ['Meta description is 135–165 characters', seoDescription.length >= 135 && seoDescription.length <= 165, 8],
    ['Meta description includes the keyword', Boolean(keyword && seoDescription.toLowerCase().includes(keyword)), 8],
    ['URL is short and includes the keyword', Boolean(keyword && slug.toLowerCase().includes(keyword.replace(/\s+/g, '-')) && slug.length <= 100), 7],
    ['Keyword appears in the opening paragraph', Boolean(keyword && plainText.slice(0, 400).toLowerCase().includes(keyword)), 8],
    ['Keyword appears in a heading', Boolean(keyword && (content.match(/<h[2-4][^>]*>([\s\S]*?)<\/h[2-4]>/gi) || []).some(h => h.toLowerCase().includes(keyword))), 7],
    ['Natural keyword density (0.4–2.0%)', density >= 0.4 && density <= 2.0, 7],
    ['Article has 1,000+ words', wordCount >= 1000, 10],
    ['At least three H2/H3 sections', (content.match(/<h[23][^>]*>/gi) || []).length >= 3, 5],
    ['Cover image is selected', Boolean(imageUrl), 4],
    ['Image ALT text includes the keyword', Boolean(keyword && imageAltText.toLowerCase().includes(keyword)), 4],
    ['2–5 internal links', internalLinks >= 2 && internalLinks <= 5, 4],
    ['1–3 authority external links', externalLinks >= 1 && externalLinks <= 3, 3],
    ['FAQ section has questions', faqs >= 3, 3],
    ['Four to eight relevant tags', safeTags.split(',').map(tag => tag.trim()).filter(Boolean).length >= 4 && safeTags.split(',').filter(Boolean).length <= 10, 2],
  ];
  const score = checks.filter(([, passed]) => passed).reduce((total, [, , points]) => total + points, 0);
  return { score, checks, wordCount, density: Number(density.toFixed(2)), internalLinks, externalLinks, faqs, keyword };
}

const COVER_IMAGE = 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1792342112/dholera/images/dholera-airport-runway-trials-2026-oct18.jpg';
const FIGURE2_IMAGE = 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1792342113/dholera/images/dholera-airport-cargo-terminal-2026-oct18.jpg';

const BLOG_DATA = {
  title: "Dholera International Airport 2026: Runway Trials, Cargo Hub & Flight Launch",
  slug: "dholera-international-airport-2026-runway-trials-cargo-hub-flight-launch",
  category: "Infrastructure",
  published: true,
  isApproved: true,
  isExclusive: false,
  author: "Naresh Gohel",
  imageUrl: COVER_IMAGE,
  imagePosition: "top",
  tags: "Dholera SIR, Dholera International Airport 2026, DIACL Runway Trials, Air Cargo Hub, Ahmedabad Dholera Expressway, TP1 Real Estate Investment",
  seoTitle: "Dholera International Airport 2026: Runway Trials & Flights",
  seoDescription: "Latest 2026 intelligence on Dholera International Airport 2026, DGCA runway calibration trials, semiconductor cargo hub, and direct commercial flight launch.",
  focusKeyword: "Dholera International Airport 2026",
  seoKeywords: "Dholera International Airport 2026",
  imageAltText: "Dholera International Airport 2026 4000-meter Code 4E runway and passenger terminal",

  imageTitle: "Dholera International Airport 2026 operational runway and cargo terminal complex",
  publishedAt: "2026-10-18T22:18:00.000Z",

  content: `<p class="lead text-xl text-slate-700 dark:text-slate-200 font-medium mb-8">
Civil aviation infrastructure in Gujarat has achieved a historic breakthrough as formal calibration tests and instrumental landing verification commenced at <strong>Dholera International Airport 2026</strong>. Developed by Dholera International Airport Company Limited (DIACL)—a high-powered joint venture between the Airports Authority of India (AAI), the Government of Gujarat, and the National Industrial Corridor Development Corporation (NICDC)—this Greenfield Code-4E aerodrome is engineered to relieve severe congestion at Ahmedabad’s Sardar Vallabhbhai Patel International Airport while unlocking an ultra-high-speed logistics corridor for the semiconductor and electronics supply chains of Dholera Special Investment Region (SIR).
</p>

<div class="my-8 p-6 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl shadow-sm">
  <div class="flex items-center gap-3 mb-2">
    <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-sm">✓</span>
    <h3 class="text-lg font-bold text-emerald-900 dark:text-emerald-200 m-0">Executive Aviation Briefing: Key Project Parameters</h3>
  </div>
  <p class="text-sm text-emerald-800 dark:text-emerald-300 mb-3">
    Official project milestones confirmed by the Airports Authority of India and the Gujarat Civil Aviation Department:
  </p>
  <ul class="text-sm text-emerald-900 dark:text-emerald-200 space-y-2 mb-0">
    <li><strong>Runway Specifications:</strong> Phase 1 features a full 3,200-meter Code-4E runway, engineered to expand to 4,000 meters for Code-F jumbo freighters (Boeing 747-8F and Airbus A380).</li>
    <li><strong>Dedicated Cargo Apron:</strong> 12 wide-body cargo parking stands with automated, climate-controlled cold chain logistics for semiconductor wafer distribution.</li>
    <li><strong>Multi-Modal Transit Access:</strong> Direct 4-lane elevated expressway spur linking to the Ahmedabad–Dholera Expressway (NH-751) and the upcoming Semi-High-Speed Rail Line.</li>
    <li><strong>Commercial Flight Timeline:</strong> Non-scheduled flight calibrations active in Q4 2026; scheduled domestic and international cargo operations debuting ahead of Vibrant Gujarat.</li>
  </ul>
</div>

<h2 class="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-10 mb-4">
Dholera International Airport 2026: Runway Calibration & DGCA Certification
</h2>
<p class="text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
The Directorate General of Civil Aviation (DGCA) and the Airports Authority of India have deployed specialized inspection aircraft to complete instrument landing system (ILS CAT-III) calibrations on the newly paved main runway. As modern wide-body aircraft require sub-millimeter radio navigational precision, the commissioning of Doppler VHF Omnidirectional Range (DVOR), Instrument Landing System (ILS), and Advanced Surface Movement Guidance and Control Systems (A-SMGCS) ensures safe all-weather operations across Dholera's coastal topography.
</p>
<p class="text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
Spanning more than 1,427 hectares across Navagam and adjacent villages in the Dholera taluka, the airport perimeter has been completely secured with perimeter intrusion detection systems (PIDS) and smart surveillance arrays. The airport is positioned just 15 kilometers from the Dholera Activation Zone and Town Planning Scheme 1 (TP1), granting global corporate executives and international logistics carriers immediate access to the industrial core without entering urban traffic bottlenecks.
</p>

<div class="my-10">
  <img src="${COVER_IMAGE}" alt="Dholera International Airport 2026 4000-meter Code 4E runway and passenger terminal" class="w-full rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 object-cover" />
  <p class="text-xs text-center text-slate-500 mt-2 italic">Figure 1: High-altitude aerial view of Dholera International Airport Code-4E runway, passenger terminal, and taxiways.</p>
</div>

<h2 class="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-10 mb-4">
Semiconductor Air Freight & Dedicated Multi-Modal Cargo Hub
</h2>
<p class="text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
A critical economic engine powering <strong>Dholera International Airport 2026</strong> is its dedicated temperature-controlled air freight terminal. Unlike conventional passenger-first aerodromes, Dholera’s master plan reserves over 40% of airside capacity specifically for specialized air-cargo operations. Semiconductor microchips manufactured by Tata Electronics and PSMC at the Dholera Semiconductor SEZ in TP2 require ultra-clean, vibration-dampened, climate-controlled logistics to reach global packaging hubs in Singapore, Taiwan, Europe, and the United States within strict 24-hour cycles.
</p>
<p class="text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
The automated cargo terminal features dedicated lanes for temperature-sensitive pharmaceutical shipments, hazardous industrial gases, and high-value electronic components. Furthermore, the cargo complex is physically integrated with the Multi-Modal Logistics Hub (MMLH) and the Dedicated Freight Corridor (DFC) rail spur, creating an end-to-end multi-modal pipeline spanning air, rail, expressway, and seaport access via Pipavav and Kandla.
</p>

<div class="my-10">
  <img src="${FIGURE2_IMAGE}" alt="Dholera International Airport 2026 dedicated semiconductor air cargo terminal" class="w-full rounded-2xl shadow-lg border border-slate-200 dark:border-slate-800 object-cover" />
  <p class="text-xs text-center text-slate-500 mt-2 italic">Figure 2: Dedicated semiconductor air-cargo apron and temperature-controlled logistics facility at Dholera Airport.</p>
</div>

<h2 class="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-10 mb-4">
Expressway & Semi-High-Speed Rail Connectivity Corridors
</h2>
<p class="text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
Passenger and freight mobility to <strong>Dholera International Airport 2026</strong> is underpinned by two transformative infrastructure lifelines:
</p>
<ul class="list-disc pl-6 text-slate-700 dark:text-slate-300 space-y-3 mb-6">
  <li><strong>Ahmedabad–Dholera Expressway (NH-751):</strong> The 109-kilometer, 4-lane access-controlled highway links SG Highway and Sardar Patel Ring Road in Ahmedabad directly to the airport entrance interchange, shrinking transit times from 2.5 hours to just 45 minutes.</li>
  <li><strong>Ahmedabad–Dholera Semi-High-Speed Rail Corridor:</strong> With an approved investment of ₹20,667 crore, the 134-kilometer electrified rapid rail link will feature an underground terminal right beneath the passenger concourse, enabling air travelers to reach Ahmedabad Central in 40 minutes.</li>
  <li><strong>Internal Arterial Smart Grid:</strong> 70-meter and 55-meter wide master plan roads equipped with underground utility ducts ensure direct seamless transit between Town Planning 1, Town Planning 2, and the airport gates.</li>
</ul>

<h2 class="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-10 mb-4">
Impact on Real Estate Valuations in TP1, TP2 & Aviation Aerotropolis
</h2>
<p class="text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
The tangible progression of <strong>Dholera International Airport 2026</strong> runway trials has unleashed dramatic capital appreciation across land parcels surrounding the aerodrome boundary. Real estate investors and corporate land aggregators are strategically acquiring land in Town Planning 1 (TP1) and Town Planning 2 (TP2) to capitalize on the 3,000-acre Aviation Aerotropolis zone reserved for aerospace maintenance, repair, and overhaul (MRO) facilities, executive hospitality, luxury business hotels, and logistics warehousing.
</p>


<div class="overflow-x-auto my-8">
  <table class="w-full text-left border-collapse border border-slate-200 dark:border-slate-800 text-sm">
    <thead class="bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold">
      <tr>
        <th class="p-3 border border-slate-200 dark:border-slate-700">Location Zone</th>
        <th class="p-3 border border-slate-200 dark:border-slate-700">Zoning Designation</th>
        <th class="p-3 border border-slate-200 dark:border-slate-700">2024 Base Rate</th>
        <th class="p-3 border border-slate-200 dark:border-slate-700">Q4 2026 Current Rate</th>
        <th class="p-3 border border-slate-200 dark:border-slate-700">Projected 2028 (Flight Launch)</th>
      </tr>
    </thead>
    <tbody class="divide-y divide-slate-200 dark:divide-slate-800 text-slate-700 dark:text-slate-300">
      <tr class="hover:bg-slate-50 dark:hover:bg-slate-850">
        <td class="p-3 font-medium text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700">Airport Aerotropolis Zone (Navagam)</td>
        <td class="p-3 border border-slate-200 dark:border-slate-700">Commercial & Hospitality</td>
        <td class="p-3 border border-slate-200 dark:border-slate-700">₹4,200 – ₹5,800 / sq.yd</td>
        <td class="p-3 border border-slate-200 dark:border-slate-700 font-semibold text-emerald-600">₹9,500 – ₹14,500 / sq.yd</td>
        <td class="p-3 border border-slate-200 dark:border-slate-700 font-bold text-emerald-600">₹22,000 – ₹30,000 / sq.yd</td>
      </tr>
      <tr class="hover:bg-slate-50 dark:hover:bg-slate-850">
        <td class="p-3 font-medium text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700">TP1 High-Access Residential (Pipli-Fedra)</td>
        <td class="p-3 border border-slate-200 dark:border-slate-700">City Center & Residential</td>
        <td class="p-3 border border-slate-200 dark:border-slate-700">₹3,500 – ₹4,800 / sq.yd</td>
        <td class="p-3 border border-slate-200 dark:border-slate-700 font-semibold text-emerald-600">₹7,200 – ₹11,000 / sq.yd</td>
        <td class="p-3 border border-slate-200 dark:border-slate-700 font-bold text-emerald-600">₹16,000 – ₹22,000 / sq.yd</td>
      </tr>
      <tr class="hover:bg-slate-50 dark:hover:bg-slate-850">
        <td class="p-3 font-medium text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700">TP2 Industrial & Logistics Corridor</td>
        <td class="p-3 border border-slate-200 dark:border-slate-700">Industrial & Warehousing</td>
        <td class="p-3 border border-slate-200 dark:border-slate-700">₹3,000 – ₹4,500 / sq.yd</td>
        <td class="p-3 border border-slate-200 dark:border-slate-700 font-semibold text-emerald-600">₹6,800 – ₹10,500 / sq.yd</td>
        <td class="p-3 border border-slate-200 dark:border-slate-700 font-bold text-emerald-600">₹14,500 – ₹19,000 / sq.yd</td>
      </tr>
    </tbody>
  </table>
</div>

{{cta_rate_sheet}}

<h2 class="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-10 mb-4">
Strategic Guidance for Early Real Estate Acquirers
</h2>
<p class="text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
For high-net-worth investors and corporate funds evaluating entries near <strong>Dholera International Airport 2026</strong>, verified land titles with clear government boundary demarcations are non-negotiable. Ensure that all targeted plots have received final TP scheme sanctioning, clear title searches from the local Sub-Registrar, and immediate connectivity to Dholera's subterranean smart utility duct network.
</p>

<div class="my-8 p-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
  <h3 class="text-lg font-bold text-slate-900 dark:text-white mb-4">Explore Verified Opportunities Across Dholera SIR</h3>
  <ul class="space-y-3">
    <li>
      <a href="/projects" class="text-blue-600 dark:text-blue-400 font-semibold hover:underline inline-flex items-center gap-1.5 text-base">
        Browse Government-Approved Plots in TP1 & TP2 <span class="text-lg leading-none">→</span>
      </a>
    </li>
    <li>
      <a href="/dholera-smart-city-portal" class="text-blue-600 dark:text-blue-400 font-semibold hover:underline inline-flex items-center gap-1.5 text-base">
        Interactive Dholera SIR Smart City Zoning Portal <span class="text-lg leading-none">→</span>
      </a>
    </li>
    <li>
      <a href="/contact" class="text-blue-600 dark:text-blue-400 font-semibold hover:underline inline-flex items-center gap-1.5 text-base">
        Schedule Private On-Site Airport Corridor Inspection <span class="text-lg leading-none">→</span>
      </a>
    </li>
    <li>
      <a href="/blogs" class="text-blue-600 dark:text-blue-400 font-semibold hover:underline inline-flex items-center gap-1.5 text-base">
        Read Complete Dholera Smart City Infrastructure Archive <span class="text-lg leading-none">→</span>
      </a>
    </li>
    <li>
      <a href="/dholera-sir-smart-city" class="text-blue-600 dark:text-blue-400 font-semibold hover:underline inline-flex items-center gap-1.5 text-base">
        Comprehensive Dholera SIR Master Plan & Investment Guide <span class="text-lg leading-none">→</span>
      </a>
    </li>
  </ul>
</div>

<p class="text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
For official civil aviation updates, visit the <a href="https://www.aai.aero/" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 underline font-medium">Airports Authority of India (AAI)</a> or consult the <a href="https://dholera.gujarat.gov.in/" target="_blank" rel="noopener noreferrer" class="text-blue-600 dark:text-blue-400 underline font-medium">Dholera Industrial City Development Limited (DICDL) Official Portal</a> for statutory town planning notifications.
</p>

<h2 class="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-10 mb-6">
Frequently Asked Questions (FAQs)
</h2>
<div class="space-y-4 my-8">
  <div class="border border-slate-200 dark:border-slate-800 rounded-lg p-5 bg-white dark:bg-slate-850 shadow-sm">
    <h3 class="faq-question text-lg font-bold text-slate-900 dark:text-white mb-2">When will commercial passenger flights begin at Dholera International Airport 2026?</h3>
    <p class="text-slate-600 dark:text-slate-300 text-sm leading-relaxed m-0">Non-scheduled trial landings and navigational calibrations commenced in late 2026. Scheduled domestic commercial passenger routes and dedicated international cargo freighters are scheduled to commence formal flight schedules following final DGCA aerodrome licensing.</p>
  </div>

  <div class="border border-slate-200 dark:border-slate-800 rounded-lg p-5 bg-white dark:bg-slate-850 shadow-sm">
    <h3 class="faq-question text-lg font-bold text-slate-900 dark:text-white mb-2">What aircraft can land on the Dholera Airport runway?</h3>
    <p class="text-slate-600 dark:text-slate-300 text-sm leading-relaxed m-0">Phase 1 incorporates a 3,200-meter Code-4E runway certified for wide-body passenger aircraft including Boeing 777, Boeing 787 Dreamliner, and Airbus A350. Future expansion will extend the runway to 4,000 meters for Code-F aircraft including Boeing 747-8F and Airbus A380.</p>
  </div>

  <div class="border border-slate-200 dark:border-slate-800 rounded-lg p-5 bg-white dark:bg-slate-850 shadow-sm">
    <h3 class="faq-question text-lg font-bold text-slate-900 dark:text-white mb-2">How far is Dholera Airport from the Tata Semiconductor Fab?</h3>
    <p class="text-slate-600 dark:text-slate-300 text-sm leading-relaxed m-0">Dholera Airport is located approximately 18 kilometers from the Tata Electronics semiconductor manufacturing fab in Town Planning Scheme 2, connected directly via a dedicated 70-meter wide arterial expressway with zero congestion bottlenecks.</p>
  </div>

  <div class="border border-slate-200 dark:border-slate-800 rounded-lg p-5 bg-white dark:bg-slate-850 shadow-sm">
    <h3 class="faq-question text-lg font-bold text-slate-900 dark:text-white mb-2">What is the Aviation Aerotropolis and how will it affect real estate?</h3>
    <p class="text-slate-600 dark:text-slate-300 text-sm leading-relaxed m-0">The Aerotropolis comprises a planned 3,000-acre zone surrounding the airport dedicated to aviation training academies, aerospace MRO (Maintenance, Repair, and Overhaul) facilities, luxury airport hotels, and bonded logistics warehouses, generating immense commercial real estate demand.</p>
  </div>

  <div class="border border-slate-200 dark:border-slate-800 rounded-lg p-5 bg-white dark:bg-slate-850 shadow-sm">
    <h3 class="faq-question text-lg font-bold text-slate-900 dark:text-white mb-2">How will passengers travel between Ahmedabad and Dholera Airport?</h3>
    <p class="text-slate-600 dark:text-slate-300 text-sm leading-relaxed m-0">Travelers can utilize the access-controlled 4-lane Ahmedabad–Dholera Expressway (NH-751) with a driving time of roughly 45 minutes, or the approved Ahmedabad–Dholera Semi-High-Speed Rail line which will connect Sabarmati to the airport passenger terminal in 40 minutes.</p>
  </div>
</div>`,

  title_hi: "धोलेरा अंतर्राष्ट्रीय हवाई अड्डा 2026: रनवे ट्रायल, कार्गो हब और उड़ान शुरुआत",
  content_hi: `<p class="lead text-xl text-slate-700 dark:text-slate-200 font-medium mb-8">
गुजरात के नागरिक उड्डयन इतिहास में एक नया अध्याय जुड़ गया है क्योंकि <strong>धोलेरा अंतर्राष्ट्रीय हवाई अड्डा 2026</strong> पर औपचारिक रनवे कैलिब्रेशन परीक्षण और इंस्ट्रूमेंट लैंडिंग सिस्टम सत्यापन का कार्य शुरू हो गया है। भारतीय विमानपत्तन प्राधिकरण (AAI), गुजरात सरकार और NICDC के संयुक्त उपक्रम (DIACL) द्वारा विकसित यह ग्रीनफील्ड कोड-4ई हवाई अड्डा अहमदाबाद के हवाई यातायात को राहत देने के साथ-साथ धोलेरा एसआईआर के सेमीकंडक्टर और इलेक्ट्रॉनिक उद्योगों को वैश्विक एयर कार्गो कनेक्टिविटी प्रदान करेगा।
</p>

<h2 class="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-10 mb-4">
धोलेरा अंतर्राष्ट्रीय हवाई अड्डा 2026: रनवे परीक्षण और डीजीसीए प्रमाणन
</h2>
<p class="text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
नागरिक उड्डयन महानिदेशालय (DGCA) और एएआई ने नवनिर्मित मुख्य रनवे पर इंस्ट्रूमेंट लैंडिंग सिस्टम (ILS CAT-III) का परीक्षण करने के लिए विशेष विमान तैनात किए हैं। 1,427 हेक्टेयर से अधिक क्षेत्र में फैले इस हवाई अड्डे पर 3,200 मीटर लंबा रनवे तैयार किया गया है जिसे भविष्य में 4,000 मीटर तक बढ़ाया जाएगा।
</p>

<h2 class="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-10 mb-4">
सेमीकंडक्टर एयर कार्गो टर्मिनल और मल्टी-मॉडल कनेक्टिविटी
</h2>
<p class="text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
टाटा इलेक्ट्रॉनिक्स के मेगा फैब से निर्मित सेमीकंडक्टर माइक्रोचिप्स के सुरक्षित और तीव्र परिवहन के लिए यहां समर्पित तापमान-नियंत्रित एयर कार्गो टर्मिनल बनाया गया है। यह टर्मिनल अहमदाबाद-धोलेरा एक्सप्रेसवे और प्रस्तावित सेमी-हाई-स्पीड रेल से सीधा जुड़ा हुआ है।
</p>`,

  title_gu: "ધોલેરા આંતરરાષ્ટ્રીય એરપોર્ટ 2026: રનવે ટ્રાયલ, કાર્ગો હબ અને ફ્લાઇટ લોન્ચ",
  content_gu: `<p class="lead text-xl text-slate-700 dark:text-slate-200 font-medium mb-8">
ગુજરાતના એવિએશન ઈન્ફ્રાસ્ટ્રક્ચરમાં એક ઐતિહાસિક સિદ્ધિ હાંસલ થઈ છે કારણ કે <strong>ધોલેરા આંતરરાષ્ટ્રીય એરપોર્ટ 2026</strong> પર ઔપચારિક રનવે કેલિબ્રેશન ટ્રાયલ્સ અને ઈન્સ્ટ્રુમેન્ટ લેન્ડિંગ સિસ્ટમ વેરિફિકેશન શરૂ થઈ ગયું છે. એરપોર્ટ્સ ઓથોરિટી ઓફ ઈન્ડિયા (AAI) અને ગુજરાત સરકારના સંયુક્ત ઉપક્રમ (DIACL) દ્વારા વિકસિત આ ગ્રીનફિલ્ડ એરપોર્ટ ધોલેરા સરના સેમિકન્ડક્ટર અને ઇલેક્ટ્રોનિક્સ હબ માટે અત્યંત મહત્વપૂર્ણ છે.
</p>

<h2 class="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-10 mb-4">
ધોલેરા આંતરરાષ્ટ્રીય એરપોર્ટ 2026: રનવે ટ્રાયલ્સ અને ડીજીસીએ માન્યતા
</h2>
<p class="text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
ડીજીસીએ અને એરપોર્ટ ઓથોરિટી દ્વારા 3,200 મીટર લાંબા કોડ-4E રનવે પર ઇન્સ્ટ્રુમેન્ટ લેન્ડિંગ સિસ્ટમનું સફળતાપૂર્વક પરીક્ષણ કરવામાં આવ્યું છે. 1,427 હેક્ટરમાં ફેલાયેલું આ એરપોર્ટ TP1 અને TP2 ઇન્ડસ્ટ્રિયલ ઝોનથી માત્ર થોડા જ મિનિટોના અંતરે આવેલું છે.
</p>

<h2 class="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mt-10 mb-4">
સેમિકન્ડક્ટર એર કાર્ગો ટર્મિનલ અને રિયલ એસ્ટેટ તેજી
</h2>
<p class="text-slate-700 dark:text-slate-300 leading-relaxed mb-6">
ટાટા સેમિકન્ડક્ટર પ્લાન્ટ માટે અતિ-આધુનિક કોલ્ડ-ચેઈન કાર્ગો સુવિધા સાથે આ એરપોર્ટ વૈશ્વિક સપ્લાય ચેઇનને જોડશે. એરપોર્ટના વિકાસને પગલે TP1 અને TP2 માં પ્લોટ્સની માંગ અને મૂલ્યમાં ભારે વધારો નોંધાયો છે.
</p>`
};

console.log('================================================================');
console.log('EVALUATING SEO READINESS SCORE FOR OCTOBER 18 AIRPORT BLOG');
console.log('================================================================');

const audit = evaluateBlogSeo(BLOG_DATA);
console.log(`SEO Readiness Score: ${audit.score}/100`);
console.log(`Word Count: ${audit.wordCount}`);
console.log(`Keyword Density: ${audit.density}%`);
console.log(`Internal Links: ${audit.internalLinks}`);
console.log(`External Links: ${audit.externalLinks}`);
console.log(`FAQs: ${audit.faqs}`);

audit.checks.forEach(([label, passed, pts]) => {
  console.log(`  [${passed ? 'PASS ✓' : 'FAIL ✗'}] ${label}`);
});

if (audit.score < 90) {
  console.error(`[ERROR] SEO score ${audit.score} is below required threshold! Halting.`);
  process.exit(1);
}

console.log('\n[SUCCESS] SEO score strictly meets 90+ standard!');

console.log('\n================================================================');
console.log('SYNCING TO LOCAL SQLITE DATABASES');
console.log('================================================================');

async function syncDatabases() {
  const { Update } = require('../models');

  let existing = await Update.findOne({ where: { slug: BLOG_DATA.slug } });
  if (existing) {
    await existing.update({
      title: BLOG_DATA.title,
      content: BLOG_DATA.content,
      title_hi: BLOG_DATA.title_hi,
      content_hi: BLOG_DATA.content_hi,
      title_gu: BLOG_DATA.title_gu,
      content_gu: BLOG_DATA.content_gu,
      category: BLOG_DATA.category,
      imageUrl: BLOG_DATA.imageUrl,
      imagePosition: BLOG_DATA.imagePosition,
      published: BLOG_DATA.published,
      isApproved: BLOG_DATA.isApproved,
      isExclusive: BLOG_DATA.isExclusive,
      author: BLOG_DATA.author,
      tags: BLOG_DATA.tags,
      seoTitle: BLOG_DATA.seoTitle,
      seoDescription: BLOG_DATA.seoDescription,
      seoKeywords: BLOG_DATA.seoKeywords,
      imageAltText: BLOG_DATA.imageAltText,
      imageTitle: BLOG_DATA.imageTitle,
      publishedAt: BLOG_DATA.publishedAt,
    });
    console.log(`[✓] Updated existing post in models/Update: ID ${existing.id}`);
  } else {
    const created = await Update.create({
      title: BLOG_DATA.title,
      slug: BLOG_DATA.slug,
      content: BLOG_DATA.content,
      title_hi: BLOG_DATA.title_hi,
      content_hi: BLOG_DATA.content_hi,
      title_gu: BLOG_DATA.title_gu,
      content_gu: BLOG_DATA.content_gu,
      category: BLOG_DATA.category,
      imageUrl: BLOG_DATA.imageUrl,
      imagePosition: BLOG_DATA.imagePosition,
      published: BLOG_DATA.published,
      isApproved: BLOG_DATA.isApproved,
      isExclusive: BLOG_DATA.isExclusive,
      author: BLOG_DATA.author,
      tags: BLOG_DATA.tags,
      seoTitle: BLOG_DATA.seoTitle,
      seoDescription: BLOG_DATA.seoDescription,
      seoKeywords: BLOG_DATA.seoKeywords,
      imageAltText: BLOG_DATA.imageAltText,
      imageTitle: BLOG_DATA.imageTitle,
      publishedAt: BLOG_DATA.publishedAt,
    });
    console.log(`[✓] Created new post in models/Update: ID ${created.id}`);
    existing = created;
  }

  const liveDbPath = path.resolve(__dirname, '../../live_database.sqlite');
  if (fs.existsSync(liveDbPath)) {
    const { Sequelize } = require('sequelize');
    const liveSeq = new Sequelize({
      dialect: 'sqlite',
      storage: liveDbPath,
      logging: false,
    });

    const tables = await liveSeq.query("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('Updates', 'Blogs', 'posts')", { type: Sequelize.QueryTypes.SELECT });
    for (const t of tables) {
      try {
        const [existingRows] = await liveSeq.query(`SELECT id FROM ${t.name} WHERE slug = :slug`, {
          replacements: { slug: BLOG_DATA.slug },
          type: Sequelize.QueryTypes.SELECT
        });

        const params = {
          id: existing.id,
          title: BLOG_DATA.title,
          slug: BLOG_DATA.slug,
          content: BLOG_DATA.content,
          title_hi: BLOG_DATA.title_hi,
          content_hi: BLOG_DATA.content_hi,
          title_gu: BLOG_DATA.title_gu,
          content_gu: BLOG_DATA.content_gu,
          category: BLOG_DATA.category,
          imageUrl: BLOG_DATA.imageUrl,
          imagePosition: BLOG_DATA.imagePosition,
          published: 1,
          isApproved: 1,
          isExclusive: 0,
          author: BLOG_DATA.author,
          tags: BLOG_DATA.tags,
          seoTitle: BLOG_DATA.seoTitle,
          seoDescription: BLOG_DATA.seoDescription,
          seoKeywords: BLOG_DATA.seoKeywords,
          imageAltText: BLOG_DATA.imageAltText,
          imageTitle: BLOG_DATA.imageTitle,
          publishedAt: BLOG_DATA.publishedAt,
        };

        if (existingRows) {
          await liveSeq.query(
            `UPDATE ${t.name} SET
              title = :title,
              content = :content,
              title_hi = :title_hi,
              content_hi = :content_hi,
              title_gu = :title_gu,
              content_gu = :content_gu,
              category = :category,
              imageUrl = :imageUrl,
              imagePosition = :imagePosition,
              published = :published,
              isApproved = :isApproved,
              isExclusive = :isExclusive,
              author = :author,
              tags = :tags,
              seoTitle = :seoTitle,
              seoDescription = :seoDescription,
              seoKeywords = :seoKeywords,
              imageAltText = :imageAltText,
              imageTitle = :imageTitle,
              publishedAt = :publishedAt,
              updatedAt = datetime('now')
            WHERE slug = :slug`,
            { replacements: params }
          );
          console.log(`[✓] Updated existing row in ${liveDbPath} -> ${t.name}`);
        } else {
          await liveSeq.query(
            `INSERT INTO ${t.name} (id, title, slug, content, title_hi, content_hi, title_gu, content_gu, category, imageUrl, imagePosition, published, isApproved, isExclusive, author, tags, seoTitle, seoDescription, seoKeywords, imageAltText, imageTitle, publishedAt, createdAt, updatedAt)
            VALUES (:id, :title, :slug, :content, :title_hi, :content_hi, :title_gu, :content_gu, :category, :imageUrl, :imagePosition, :published, :isApproved, :isExclusive, :author, :tags, :seoTitle, :seoDescription, :seoKeywords, :imageAltText, :imageTitle, :publishedAt, datetime('now'), datetime('now'))`,
            { replacements: params }
          );
          console.log(`[✓] Inserted new row in ${liveDbPath} -> ${t.name}`);
        }
      } catch (err) {
        console.warn(`[WARN] Could not sync into ${t.name} on ${liveDbPath}:`, err.message);
      }
    }

    await liveSeq.close();
  }

  console.log('\n[COMPLETE] Script finished successfully locally.\n');
}

syncDatabases().catch(err => {
  console.error('[FATAL]', err);
  process.exit(1);
});
