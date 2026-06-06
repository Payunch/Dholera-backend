const express = require('express');
const router = express.Router();
const { Update } = require('../models');
const { verifyToken } = require('./auth');
const { Op } = require('sequelize');
const { cleanText } = require('../utils/sanitize');
const { getPremiumBlogPosts } = require('../utils/discoverDholeraPost');
const { sendInvestorNotification } = require('../services/notificationService');
const { translateBlogPost } = require('../services/translationService');
const upload = require('../middleware/upload');
const path = require('path');

const isRemotePath = (value = '') => /^https?:\/\//i.test(String(value).trim());

// GET all updates
router.get('/', async (req, res) => {
  try {
    const { search, all, lang } = req.query;
    const targetLang = lang || 'en';
    const where = {};
    
    // Only show published updates unless 'all' is true (for admin)
    if (all !== 'true') {
      where.published = true;
    }

    // Filter by language
    where.lang = targetLang;

    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { category: { [Op.like]: `%${search}%` } },
        { content: { [Op.like]: `%${search}%` } }
      ];
    }

    let updates = await Update.findAll({
      where,
      order: [['publishedAt', 'DESC']]
    });

    // AUTO-TRANSLATE TOOL (FALLBACK)
    // If no updates found for this language, try to translate the English ones
    if (updates.length === 0 && targetLang !== 'en') {
       const englishUpdates = await Update.findAll({
         where: { ...where, lang: 'en' },
         order: [['publishedAt', 'DESC']]
       });

       if (englishUpdates.length > 0) {
         console.log(`[Auto-Translate] Listing fallback to ${targetLang}...`);
         const translatedList = [];
         for (const post of englishUpdates) {
            try {
              let trans = await Update.findOne({ where: { original_id: post.id, lang: targetLang } });
              if (!trans) {
                const results = await translateBlogPost(post, [targetLang]);
                if (results && results[0]) {
                  trans = await Update.create({
                    ...results[0],
                    lang: targetLang,
                    original_id: post.id,
                    published: true,
                    publishedAt: post.publishedAt,
                    imageUrl: post.imageUrl
                  });
                }
              }
              if (trans) translatedList.push(trans);
              else translatedList.push(post);
            } catch (err) {
              translatedList.push(post);
            }
         }
         updates = translatedList;
       }
    }

    res.json(updates);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single update by ID
router.get('/:id', async (req, res) => {
  try {
    const { all, lang } = req.query;
    const targetLang = lang || 'en';
    let update = await Update.findByPk(req.params.id);
    
    if (!update) {
      return res.status(404).json({ error: 'Update not found' });
    }

    // If a different language is requested, try to find the linked translation
    if (targetLang !== update.lang) {
      const originalId = update.original_id || update.id;
      let translated = await Update.findOne({
        where: {
          [Op.or]: [
            { id: originalId, lang: targetLang },
            { original_id: originalId, lang: targetLang }
          ]
        }
      });

      // AUTO-TRANSLATE FALLBACK
      if (!translated && targetLang !== 'en') {
         try {
           const original = update.lang === 'en' ? update : await Update.findByPk(originalId);
           if (original) {
             const results = await translateBlogPost(original, [targetLang]);
             if (results && results[0]) {
               translated = await Update.create({
                 ...results[0],
                 lang: targetLang,
                 original_id: original.id,
                 published: true,
                 publishedAt: original.publishedAt,
                 imageUrl: original.imageUrl
               });
             }
           }
         } catch (e) {}
      }
      if (translated) update = translated;
    }

    // Only show if published unless 'all' is true
    if (all !== 'true' && !update.published) {
      return res.status(404).json({ error: 'Update not found' });
    }

    res.json(update);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST create update (Admin)
router.post('/', verifyToken, upload.single('image'), async (req, res) => {
  try {
    const { title, content, category, published, imageUrl, imagePosition, publishedAt } = req.body;
    
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
      imageUrl: finalImageUrl,
      imagePosition: imagePosition || 'top',
      publishedAt: publishedAt || new Date()
    });

    // Send push notification if published
    if (update.published) {
      sendInvestorNotification(
        'New Market Insight',
        update.title,
        { type: 'insight', id: update.id.toString() }
      );
    }

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

// PUT update (Admin)
router.put('/:id', verifyToken, upload.single('image'), async (req, res) => {
  try {
    const update = await Update.findByPk(req.params.id);
    if (!update) return res.status(404).json({ error: 'Update not found' });

    const { title, content, category, published, imageUrl, imagePosition, publishedAt } = req.body;
    
    let finalImageUrl = update.imageUrl;
    if (imageUrl !== undefined) finalImageUrl = cleanText(imageUrl, 500) || null;

    if (req.file) {
      const filePath = req.file.secure_url || req.file.path;
      if (isRemotePath(filePath)) {
        finalImageUrl = filePath;
      } else {
        const uploadsBase = path.resolve(__dirname, '..');
        finalImageUrl = '/' + path.relative(uploadsBase, filePath).replace(/\\/g, '/');
      }
    }

    await update.update({
      title: title !== undefined ? cleanText(title, 255) : update.title,
      content: content !== undefined ? cleanText(content, 50000) : update.content,
      category: category !== undefined ? (cleanText(category, 100) || 'General') : update.category,
      published: published !== undefined ? (published === 'true' || published === true || published === '1') : update.published,
      imageUrl: finalImageUrl,
      imagePosition: imagePosition !== undefined ? imagePosition : update.imagePosition,
      publishedAt: publishedAt !== undefined ? publishedAt : update.publishedAt
    });

    res.json(update);
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

    const payloads = getPremiumBlogPosts();
    let createdCount = 0;
    let updatedCount = 0;

    for (const payload of payloads) {
      const existing = await Update.findOne({ where: { title: payload.title } });
      if (existing) {
        await existing.update(payload);
        updatedCount++;
      } else {
        await Update.create(payload);
        createdCount++;
      }
    }

    return res.json({ 
      message: 'Premium blog posts seeded', 
      created: createdCount, 
      updated: updatedCount 
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
