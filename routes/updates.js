const express = require('express');
const router = express.Router();
const { Update } = require('../models');
const { verifyToken } = require('./auth');
const { Op } = require('sequelize');
const { cleanText } = require('../utils/sanitize');
const upload = require('../middleware/upload');
const path = require('path');

const isRemotePath = (value = '') => /^https?:\/\//i.test(String(value).trim());

const getDiscoverDholeraPayload = () => {
  const title = "Discover Dholera: India's First Greenfield Smart City";
  const content = `🏙️ Discover Dholera: India’s First Greenfield Smart City
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

  return {
    title,
    content,
    category: 'Infrastructure',
    imageUrl:
      'https://images.pexels.com/photos/4490698/pexels-photo-4490698.jpeg?cs=srgb&dl=pexels-mvdheuvel-4490698.jpg&fm=jpg',
    published: true
  };
};

// GET all updates
router.get('/', async (req, res) => {
  try {
    const { search, all } = req.query;
    const where = {};
    
    // Only show published updates unless 'all' is true (for admin)
    if (all !== 'true') {
      where.published = true;
    }

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { category: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } }
      ];
    }

    const updates = await Update.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
    res.json(updates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create update (Admin)
router.post('/', verifyToken, upload.single('image'), async (req, res) => {
  try {
    const { title, content, category, published, imageUrl } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    let finalImageUrl = cleanText(imageUrl, 500) || null;

    if (req.file) {
      // Use Cloudinary URL if available, otherwise relative path for local disk
      const filePath = req.file.secure_url || req.file.path;
      if (isRemotePath(filePath)) {
        finalImageUrl = filePath;
      } else {
        // Convert absolute path to relative for static serving
        const uploadsBase = path.resolve(__dirname, '..');
        finalImageUrl = '/' + path.relative(uploadsBase, filePath).replace(/\\/g, '/');
      }
    }

    const update = await Update.create({
      title: cleanText(title, 255),
      content: cleanText(content, 50000),
      category: cleanText(category, 100) || 'General',
      published: published === 'true' || published === true || published === '1',
      imageUrl: finalImageUrl
    });

    res.status(201).json(update);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE update (Admin)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const update = await Update.findByPk(req.params.id);
    if (!update) return res.status(404).json({ error: 'Update not found' });
    await update.destroy();
    res.json({ message: 'Update deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST one-time seed for production without shell access
router.post('/seed/discover-dholera', async (req, res) => {
  try {
    const expectedKey = process.env.BLOG_SEED_KEY;
    if (!expectedKey) {
      return res.status(503).json({ error: 'BLOG_SEED_KEY is not configured' });
    }

    const providedKey = req.headers['x-seed-key'];
    if (providedKey !== expectedKey) {
      return res.status(401).json({ error: 'Invalid seed key' });
    }

    const payload = getDiscoverDholeraPayload();
    const legacyTitles = [
      "Discover Dholera: India's First Greenfield Smart City",
      'Discover Dholera: India’s First Greenfield Smart City'
    ];

    const existingRows = await Update.findAll({ where: { title: legacyTitles } });
    if (existingRows.length > 0) {
      for (const row of existingRows) {
        await row.update(payload);
      }
      return res.json({ message: 'Blog updated', count: existingRows.length });
    }

    const created = await Update.create(payload);
    return res.status(201).json({ message: 'Blog created', id: created.id });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
 