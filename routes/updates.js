const express = require('express');
const router = express.Router();
const { Update } = require('../models');
const { verifyToken } = require('./auth');
const { Op } = require('sequelize');
const { cleanText } = require('../utils/sanitize');
const { getDiscoverDholeraPayload } = require('../utils/discoverDholeraPost');
const upload = require('../middleware/upload');
const path = require('path');

const isRemotePath = (value = '') => /^https?:\/\//i.test(String(value).trim());

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

    const providedKey = req.headers['x-seed-key'] || req.query.key;
    if (!providedKey || providedKey !== expectedKey) {
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
 