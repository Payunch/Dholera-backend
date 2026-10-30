const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
const { sendInvestorNotification } = require('../services/notificationService');

const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../data/database.sqlite');
const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: DB_PATH,
  logging: false,
});

const BLOG_DATA = {
  id: 218,
  title: '⚡ App Exclusive: Dholera High-Speed Bullet Train Hub & Multi-Modal Transit Terminal 2026',
  slug: 'app-exclusive-dholera-bullet-train-multimodal-terminal-2026',
  category: 'App Exclusive',
  author: 'Dholera Platform Intelligence',
  published: 1,
  isApproved: 1,
  isExclusive: 1, // APP ONLY - Hidden from web, visible exclusively in mobile app
  imageUrl: 'https://res.cloudinary.com/dhf36t4vw/image/upload/v1792127722/dholera/images/dholera-semiconductor-hub-fujifilm-dhl-2026.jpg',
  imagePosition: 'top',
  imageAltText: 'Dholera High Speed Bullet Train Multi-Modal Transit Hub Station 2026',
  imageTitle: 'Dholera Multi-Modal Transit Terminal & Bullet Train Station 2026',
  publishedAt: new Date().toISOString(),
  tags: 'App Exclusive, Bullet Train, Multi-Modal Hub, Dholera SIR, TP2, High Speed Rail, Transit Oriented Development',
  seoTitle: 'App Exclusive: Dholera High-Speed Rail & Multi-Modal Hub 2026 Progress',
  seoDescription: 'Confidential app-exclusive intelligence on Dholera High-Speed Rail terminal, Multi-Modal Transit Hub, and surrounding TP2 & TP1 commercial land nodes in late 2026.',
  seoKeywords: 'Dholera bullet train, Dholera multimodal hub, Dholera app exclusive, Dholera TP2 transit, Dholera high speed rail station 2026',
  title_hi: '⚡ ऐप एक्सक्लूसिव: धोलेरा हाई-स्पीड बुलेट ट्रेन हब और मल्टी-मॉडल टर्मिनल 2026 ग्राउंड रिपोर्ट',
  title_gu: '⚡ એપ એક્સક્લુઝિવ: ધોલેરા હાઇ-સ્પીડ બુલેટ ટ્રેન હબ અને મલ્ટિ-મોડલ ટ્રાન્ઝિટ ટર્મિનલ 2026 ગ્રાઉન્ડ રિપોર્ટ',
  content: `
<h2>Executive Summary: App-Exclusive Infrastructure Dossier</h2>
<p>This report is delivered <strong>exclusively to Dholera Platform Mobile App users</strong>. As of late 2026, engineering work on the <strong>Dholera Multi-Modal Transport Hub (MMTH)</strong> and integrated High-Speed Rail (HSR) feeder connection has accelerated into its core structural execution phase under the oversight of <a href="https://dholera.gujarat.gov.in" target="_blank" rel="noopener noreferrer">Dholera Industrial City Development Limited (DICDL)</a> and National High Speed Rail Corporation Limited (NHSRCL).</p>

<p>Designed as the primary mobility nerve center of Dholera Special Investment Region (DSIR), the MMTH seamlessly integrates four distinct transit corridors: the 109 km Ahmedabad-Dholera Expressway, the dedicated High-Speed Passenger Metro corridor, regional bus rapid transit (BRT), and seamless cargo connectivity linked to the TP4 cargo airport precinct.</p>

<figure style="margin: 24px 0;">
  <img src="https://res.cloudinary.com/dhf36t4vw/image/upload/v1792127722/dholera/images/dholera-semiconductor-hub-fujifilm-dhl-2026.jpg" alt="Dholera Multi-Modal Transit Hub Construction 2026" style="width: 100%; border-radius: 12px; object-fit: cover;" />
  <figcaption style="font-size: 12px; color: #64748b; text-align: center; margin-top: 8px;">Figure 1: Architectural elevation of Dholera Multi-Modal Transport Hub & High-Speed Station concourse in late 2026.</figcaption>
</figure>

<h2>Core Transit Integration Parameters (2026 Ground Reality)</h2>
<ul>
  <li><strong>Ahmedabad-Dholera Monorail/RRTS Alignment:</strong> 100% of piling along the central reservation of the 109 km access-controlled expressway is structurally complete. Travel duration between Ahmedabad SG Highway and Dholera ABCD Central Hub is projected at 42 minutes upon commissioning.</li>
  <li><strong>Multi-Modal Interchange Zone:</strong> Located strategically at the convergence of Town Planning Scheme 1 (TP1) and Scheme 2 (TP2), the transit concourse features subterranean automated people-mover (APM) links and direct bus terminals.</li>
  <li><strong>Sub-Surface Utility ducts:</strong> Over 72 km of ICT ducts, chilled water lines for district cooling, and 400 kV SCADA-monitored underground power grids converge at the terminal basement.</li>
</ul>

<h2>Zoning & Town Planning Valuation Dynamics (Q4 2026)</h2>
<p>Institutional developers and logistics operators are prioritizing clear-title Final Plots (FP) within a 4 km radius of the MMTH terminal node. The table below outlines prevailing statutory valuation trends across the transit corridor:</p>

<table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 13px;">
  <thead>
    <tr style="background: #1e293b; color: #ffffff;">
      <th style="padding: 10px; border: 1px solid #334155; text-align: left;">Town Planning Scheme</th>
      <th style="padding: 10px; border: 1px solid #334155; text-align: left;">Zoning Category</th>
      <th style="padding: 10px; border: 1px solid #334155; text-align: left;">Proximity to MMTH</th>
      <th style="padding: 10px; border: 1px solid #334155; text-align: left;">2026 Base Range (₹/sq yd)</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding: 8px; border: 1px solid #cbd5e1;"><strong>TP1 (Scheme 1)</strong></td>
      <td style="padding: 8px; border: 1px solid #cbd5e1;">City Center & Commercial</td>
      <td style="padding: 8px; border: 1px solid #cbd5e1;">0.5 km – 2.0 km</td>
      <td style="padding: 8px; border: 1px solid #cbd5e1;">₹12,500 – ₹18,000</td>
    </tr>
    <tr style="background: #f8fafc;">
      <td style="padding: 8px; border: 1px solid #cbd5e1;"><strong>TP2 (East Corridor)</strong></td>
      <td style="padding: 8px; border: 1px solid #cbd5e1;">High-Tech Industrial & Mixed</td>
      <td style="padding: 8px; border: 1px solid #cbd5e1;">1.8 km – 4.0 km</td>
      <td style="padding: 8px; border: 1px solid #cbd5e1;">₹9,500 – ₹14,200</td>
    </tr>
    <tr>
      <td style="padding: 8px; border: 1px solid #cbd5e1;"><strong>TP2 (West Corridor)</strong></td>
      <td style="padding: 8px; border: 1px solid #cbd5e1;">Knowledge & IT Enclave</td>
      <td style="padding: 8px; border: 1px solid #cbd5e1;">3.0 km – 6.0 km</td>
      <td style="padding: 8px; border: 1px solid #cbd5e1;">₹8,200 – ₹12,000</td>
    </tr>
  </tbody>
</table>

<h2>Investor Advisory: Verification & Legal Protocol</h2>
<p>Prospective investors and industrial corporations must adhere to statutory due diligence before executing land transactions:</p>
<ol>
  <li><strong>Verify Final Plot Status:</strong> Ensure the land has received clear demarcated Final Plot (FP) numbering from DSIRDA rather than tentative Survey Number (Sy No.) allocations.</li>
  <li><strong>Town Planning Validation:</strong> Review zoning overlays using our interactive <a href="/tp-maps">Town Planning Maps Matrix</a> to verify that the plot is not reserved for public purpose green belts, canal reservations, or future rail buffers.</li>
  <li><strong>Title & Scrutiny Engine:</strong> Run official title searches and calculate statutory registry charges with our <a href="/clearance-engine">Automated Title Clearance Engine</a>.</li>
  <li><strong>Legally Vetted Portfolios:</strong> Explore ready-possession verified properties listed on our <a href="/projects">Dholera Projects Directory</a>.</li>
</ol>

<h2>Frequently Asked Questions (App Exclusive)</h2>
<h3>When is the Dholera Multi-Modal Transport Hub scheduled for operational trials?</h3>
<p>Phase-1 civil works and expressway station interchange ramps are slated for technical trials in late 2026, aligned with the operational commissioning of the Ahmedabad-Dholera Expressway and early Tata Fab trial operations.</p>

<h3>Is this article accessible to public web visitors?</h3>
<p>No. This intelligence briefing is exclusively cataloged for registered Dholera Platform Mobile App users to deliver real-time ground verification prior to public syndication.</p>

<p style="font-size: 11px; color: #64748b; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
<strong>Statutory Disclaimer:</strong> This dossier is prepared for informational and spatial planning purposes based on publicly available master plans from DICDL and DSIRDA. Land investments carry market risks. Past appreciation does not guarantee future financial yields. Consult certified legal counsels and certified Town Planning specialists prior to financial commitments.
</p>
`,
  content_hi: `
<h2>कार्यकारी सारांश: ऐप-विशेष इंफ्रास्ट्रक्चर रिपोर्ट</h2>
<p>यह रिपोर्ट <strong>विशेष रूप से धोलेरा प्लेटफॉर्म मोबाइल ऐप उपयोगकर्ताओं के लिए</strong> प्रस्तुत की गई है। 2026 के अंत तक, <strong>धोलेरा मल्टी-मॉडल ट्रांसपोर्ट हब (MMTH)</strong> और हाई-स्पीड रेल फीडर लिंक का निर्माण अपने मुख्य चरण में प्रवेश कर चुका है।</p>
<p>अहमदाबाद-धोलेरा एक्सप्रेसवे और हाई-स्पीड मेट्रो कॉरिडोर के संगम पर स्थित यह हब धोलेरा स्मार्ट सिटी का मुख्य गतिशीलता केंद्र है।</p>
<p><strong>सत्यापन सलाह:</strong> निवेश से पूर्व DSIRDA के स्वीकृत फाइनल प्लॉट (FP) और टाउन प्लानिंग नक्शों की जांच करें। हमारे <a href="/tp-maps">टाउन प्लानिंग मैप्स</a> और <a href="/clearance-engine">टाइटल क्लीयरेंस इंजन</a> का उपयोग करें।</p>
`,
  content_gu: `
<h2>કાર્યકારી સારાંશ: એપ-એક્સક્લુઝિવ ઇન્ફ્રાસ્ટ્રક્ચર રિપોર્ટ</h2>
<p>આ વિશિષ્ટ ઇન્ટેલિજન્સ રિપોર્ટ <strong>માત્ર ધોલેરા પ્લેટફોર્મ મોબાઇલ એપ વપરાશકર્તાઓ માટે</strong> ઉપલબ્ધ છે. 2026 ના અંત સુધીમાં, <strong>ધોલેરા મલ્ટિ-મોડલ ટ્રાન્સપોર્ટ હબ (MMTH)</strong> અને હાઇ-સ્પીડ ટ્રાન્ઝિટ કનેક્ટિવિટીનું બાંધકામ પૂર્ણતાના આરે છે.</p>
<p>અમદાવાદ-ધોલેરા એક્સપ્રેસવે અને રેપિડ મેટ્રો લાઇનના સંગમ પર આવેલ આ ટર્મિનલ સમગ્ર ધોલેરા સરનું મુખ્ય કેન્દ્ર છે.</p>
<p><strong>રોકાણકારો માટે સલાહ:</strong> કોઈપણ સોદા કરતા પહેલાં DSIRDA માન્ય ફાઇનલ પ્લોટ (FP) ની ચકાસણી કરો અને અમારા <a href="/tp-maps">ટીપી મેપ્સ</a> તથા <a href="/clearance-engine">ક્લીયરન્સ એન્જિન</a> નો લાભ લો.</p>
`
};

async function publish() {
  console.log('[AppExclusive] Connecting to SQLite at:', DB_PATH);
  await sequelize.authenticate();
  console.log('[AppExclusive] Database connected successfully.');

  // Upsert into Updates table
  const query = `
    INSERT INTO Updates (
      id, title, slug, content, title_hi, content_hi, title_gu, content_gu,
      category, imageUrl, imagePosition, published, isApproved, isExclusive,
      author, tags, seoTitle, seoDescription, seoKeywords, imageAltText, imageTitle,
      publishedAt, createdAt, updatedAt
    )
    VALUES (
      :id, :title, :slug, :content, :title_hi, :content_hi, :title_gu, :content_gu,
      :category, :imageUrl, :imagePosition, :published, :isApproved, :isExclusive,
      :author, :tags, :seoTitle, :seoDescription, :seoKeywords, :imageAltText, :imageTitle,
      :publishedAt, datetime('now'), datetime('now')
    )
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      slug = excluded.slug,
      content = excluded.content,
      title_hi = excluded.title_hi,
      content_hi = excluded.content_hi,
      title_gu = excluded.title_gu,
      content_gu = excluded.content_gu,
      category = excluded.category,
      imageUrl = excluded.imageUrl,
      published = excluded.published,
      isApproved = excluded.isApproved,
      isExclusive = excluded.isExclusive,
      author = excluded.author,
      tags = excluded.tags,
      seoTitle = excluded.seoTitle,
      seoDescription = excluded.seoDescription,
      seoKeywords = excluded.seoKeywords,
      imageAltText = excluded.imageAltText,
      imageTitle = excluded.imageTitle,
      publishedAt = excluded.publishedAt,
      updatedAt = datetime('now');
  `;

  await sequelize.query(query, { replacements: BLOG_DATA });
  console.log(`[AppExclusive] ✓ Successfully saved post ID ${BLOG_DATA.id} (isExclusive: ${BLOG_DATA.isExclusive}) - "${BLOG_DATA.title}"`);

  // Dispatch FCM Push Notification to all Mobile App Investors
  console.log('[AppExclusive] Dispatching Push Notification to topic "investors"...');
  try {
    const notifRes = await sendInvestorNotification(
      '⚡ App Exclusive: High-Speed Rail & MMTH Hub',
      'Confidential ground reality report on Dholera Bullet Train Terminal & TP2 connectivity is live exclusively in the app.',
      {
        type: 'insight',
        id: BLOG_DATA.id.toString(),
        slug: BLOG_DATA.slug,
        title: BLOG_DATA.title,
        isExclusive: 'true',
        imageUrl: BLOG_DATA.imageUrl
      }
    );
    console.log('[AppExclusive] ✓ Push Notification dispatched successfully:', JSON.stringify(notifRes, null, 2));
  } catch (err) {
    console.error('[AppExclusive] Push notification error:', err.message);
  }

  await sequelize.close();
  console.log('[AppExclusive] Done!');
}

publish().catch((err) => {
  console.error('[AppExclusive] Fatal error:', err);
  process.exit(1);
});

