const { Update } = require('../models');

async function seedBlog() {
  try {
    const title = "Discover Dholera: India's First Greenfield Smart City";

    const blogContent = `🏙️ Discover Dholera: India’s First Greenfield Smart City
Welcome to the future of industrial and commercial development. Dholera Special Investment Region (DSIR) is rapidly transforming into a global manufacturing and trading hub, backed by world-class infrastructure, plug-and-play facilities, and monumental investments from industry giants.

🚀 Mega Anchor Investors Shaping Dholera
Dholera is not just a plan on paper; it is an active economic engine powered by some of the largest corporate houses in India and the world.

Tata Group’s Mega Semiconductor Fab:
Tata Electronics is establishing India's first major AI-enabled semiconductor fabrication plant in Dholera with an estimated investment of ₹91,000 crore. This monumental project is set to make Dholera the "Silicon Valley of India," creating thousands of high-tech jobs and bringing a massive ancillary supply chain to the region.

ReNew Power’s Green Energy Hub:
Leading the charge in renewable energy, ReNew is setting up a state-of-the-art solar cell and module manufacturing facility in Dholera. This aligns perfectly with Dholera's vision of sustainable development and provides a robust green energy backbone for incoming industries.

🏢 Strategic Zoning & Investment Opportunities
Dholera’s Master Plan is meticulously divided into specific Town Planning (TP) schemes, offering highly organized land parcels for diverse business needs.

Prime Commercial Zones:
Dholera features dedicated, high-density commercial zones strategically placed near major transit nodes and the central business district. These zones are designed to host corporate headquarters, IT parks, financial institutions, and retail hubs, ensuring maximum foot traffic and business visibility.

Linear Infrastructure & Alignments:
The city is built around a robust framework of linear infrastructure, most notably the 109 km Ahmedabad-Dholera Expressway and the planned Mass Rapid Transit System (MRTS). This "linear expression" of development ensures seamless, high-speed connectivity directly linking the commercial and industrial zones to major transport hubs.

Clearances & Line Permissions:
Dholera offers a transparent framework for land acquisition and development. With clearly demarcated State Road (SR) line alignments, standardized right-of-way permissions, and pre-cleared environmental regulations, investors benefit from a streamlined, "plug-and-play" setup that bypasses traditional bureaucratic delays.

📌 Why This Matters for Investors
- High-impact anchor industries accelerate ecosystem growth.
- Infrastructure-first planning reduces project execution risk.
- Strong logistics and policy alignment improve long-term value potential.`;

    const payload = {
      title,
      content: blogContent,
      category: 'Infrastructure',
      imageUrl:
        'https://images.pexels.com/photos/4490698/pexels-photo-4490698.jpeg?cs=srgb&dl=pexels-mvdheuvel-4490698.jpg&fm=jpg',
      published: true,
    };

    const legacyTitles = [
      "Discover Dholera: India's First Greenfield Smart City",
      'Discover Dholera: India’s First Greenfield Smart City',
    ];

    const existingRows = await Update.findAll({ where: { title: legacyTitles } });

    if (existingRows.length > 0) {
      for (const row of existingRows) {
        await row.update(payload);
      }
      console.log(`Blog post updated successfully (${existingRows.length} record(s)).`);
    } else {
      await Update.create(payload);
      console.log('Blog post seeded successfully!');
    }

    process.exit(0);
  } catch (error) {
    console.error('Error seeding blog:', error);
    process.exit(1);
  }
}

seedBlog();
