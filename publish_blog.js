const sequelize = require('./config/database');
const Update = require('./models/Update');

const content = `
<p>Imagine investing in a city <em>before</em> it becomes the next major economic hub of the country. That is exactly the opportunity presenting itself in <strong>Dholera Special Investment Region (SIR)</strong>.</p>
<p>As India's first platinum-rated greenfield smart city, Dholera is not just a real estate project; it is a meticulously planned economic powerhouse that is larger than the country of Singapore. For investors looking for high-growth potential in 2026, Dholera is currently sitting at the top of the list.</p>
<p>Here is why smart money is moving to Dholera right now, and how you can get involved.</p>

<h3>1. Unprecedented Connectivity and Infrastructure</h3>
<p>The true value of real estate is driven by infrastructure, and Dholera is setting new benchmarks. The upcoming <strong>Dholera International Airport</strong> is designed to handle massive passenger and cargo traffic, significantly reducing the load on Ahmedabad.</p>
<p>Coupled with the <strong>Ahmedabad-Dholera Expressway</strong> and dedicated freight corridors, the city is positioned to be a logistical dream. This level of connectivity guarantees that commercial and residential land values will surge as these projects reach completion.</p>

<h3>2. Massive Government & Corporate Backing</h3>
<p>Dholera isn't a speculative pipe dream. It is a cornerstone of the Delhi-Mumbai Industrial Corridor (DMIC). Major multinational corporations, including the Tata Group's massive semiconductor fabrication plant, have already committed thousands of crores in investments.</p>
<p>Where large corporations go, massive employment follows. And where employment goes, the demand for premium residential and commercial real estate skyrockets.</p>

<h3>3. Smart, Sustainable, and Future-Proof</h3>
<p>Unlike legacy cities struggling with traffic, pollution, and outdated grids, Dholera is built from the ground up for the future.</p>
<ul>
<li><strong>100% Underground Utilities:</strong> No hanging wires or open drains.</li>
<li><strong>Smart Water Management:</strong> Zero waste discharge and intelligent recycling.</li>
<li><strong>ICT Enabled:</strong> A central command center manages traffic, security, and civic amenities in real-time.</li>
</ul>

<h3>4. The "Early Mover" Advantage</h3>
<p>Historically, the highest returns in real estate are made by those who buy during the development phase, not after the city is fully built. Currently, land prices in Dholera are at a highly attractive entry point, but they are appreciating rapidly as infrastructure milestones are hit. Waiting another year could mean missing out on the exponential growth phase.</p>

<h3>What is the Next Step?</h3>
<p>If you want to capitalize on the Dholera boom, you need accurate information and verified opportunities.</p>
<p>🚨 <strong>Exclusive Offer for Our Readers!</strong></p>
<p>We are currently running an exclusive <strong>10-Day Access Pass</strong> offering inside looks at premium verified plots in Dholera.</p>
<p>👉 <a href="/" style="color: #FF7A00; text-decoration: underline;"><strong>Click Here to Claim Your Exclusive Access Now</strong></a></p>
<p><em>Hurry, this offer is strictly time-sensitive and requires a quick OTP verification to unlock.</em></p>
`;

async function publish() {
  try {
    await sequelize.authenticate();
    const post = await Update.create({
      title: "Why Dholera Smart City is the Ultimate Real Estate Investment in 2026",
      content: content,
      category: "Investment",
      imageUrl: "/uploads/dholera_blog_image.png",
      imagePosition: "top",
      published: true,
      publishedAt: new Date(),
      lang: "en",
      author: "Dholera Admin",
      tags: "Dholera Smart City, Dholera SIR, Investment",
      seoTitle: "Why Invest in Dholera Smart City 2026",
      seoDescription: "Discover why Dholera Smart City is India's fastest-growing real estate hub. Learn about upcoming infrastructure and why early investors are securing prime land today.",
      seoKeywords: "Dholera Smart City investment, Dholera SIR, buy land in Dholera, India smart city projects"
    });
    console.log("Blog post published successfully with ID:", post.id);
    process.exit(0);
  } catch(e) {
    console.error(e);
    process.exit(1);
  }
}

publish();
