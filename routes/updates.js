const express = require('express');
const router = express.Router();
const { Update } = require('../models');
const { verifyToken } = require('./auth');
const { Op } = require('sequelize');
const { cleanText, cleanHtml } = require('../utils/sanitize');
const { getPremiumBlogPosts } = require('../utils/discoverDholeraPost');
const { sendInvestorNotification } = require('../services/notificationService');
const { translateBlogPost } = require('../services/translationService');
const upload = require('../middleware/upload');
const path = require('path');

// RECOVERY ENDPOINT
router.post('/recover-post', async (req, res) => {
  try {
    const { Update } = require('../models');
    const { id, content, lang } = req.body;
    
    // Find all posts that share this original_id (the translated posts)
    // and delete them so they can be freshly translated from the recovered content
    if (lang === 'en') {
      await Update.destroy({ where: { original_id: id } });
    }
    
    // Update the actual post
    await Update.update({ content }, { where: { id } });
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/migrate-db-now', async (req, res) => {
  try {
    const { Update } = require('../models');
    const updates = await Update.findAll();
    
    let count = 0;
    for (const update of updates) {
      let content = update.content;
      let modified = false;
      
      // Cleanup old contact text from DB
      if (content.includes('dholerahub.com') || content.includes('7435808031') || content.includes('Contact us today') || content.includes('Want to learn more about Dholera?')) {
        
        // Remove old banners
        content = content.replace(/<div class="mt-8 rounded-2xl bg-slate-50[^]*?Contact Us Now<\/a>[\s\S]*?<\/div>/g, '');
        content = content.replace(/<div class="mt-8 rounded-2xl bg-slate-50[^]*?<\/div>/g, '');
        
        // Remove old text paragraphs
        content = content.replace(/<p[^>]*>[\s\S]*?(?:7435808031|dholerahub\.com|Contact us today|Call\/WhatsApp)[\s\S]*?<\/p>/gi, '');
        content = content.replace(/📞[\s\S]*?7435808031/g, '');
        content = content.replace(/🌐[\s\S]*?dholerahub\.com/g, '');
        content = content.replace(/Contact us today[\s\S]*?Dholera SIR\./gi, '');
        
        const newContactBlock = `\n<p class="wp-block-paragraph">📞 Call/WhatsApp: <a href="https://wa.me/917435808031" target="_blank" rel="noopener noreferrer"><strong>+91 7435808031</strong></a></p>\n<p class="wp-block-paragraph">🌐 Website: <a href="https://dholeraplatform.com/contact"><strong>https://dholeraplatform.com/contact</strong></a></p>\n<p class="wp-block-paragraph">Contact us today to discuss your requirements and discover the best land investment opportunities in Dholera SIR.</p>`;
        
        if (!content.includes('href="https://dholeraplatform.com/contact"')) {
          content = content + newContactBlock;
        }
        modified = true;
      }
      
      if (modified) {
        update.content = content.trim();
        await update.save();
        count++;
      }
    }
    res.json({ message: `Updated contact block on ${count} posts!` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const { search, all, lang } = req.query;
    const targetLang = lang || 'en';
    const where = {};
    
    // Only show published updates unless 'all' is true (for admin)
    if (all !== 'true') {
      where.published = true;
    }

    // Always fetch English updates as the base list
    where.lang = 'en';

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

    if (targetLang !== 'en') {
      // Fetch all existing translations for the target language
      const existingTranslations = await Update.findAll({
        where: { lang: targetLang }
      });
      
      const translationMap = {};
      for (const t of existingTranslations) {
        if (t.original_id) translationMap[t.original_id] = t;
      }
      
      const translatedList = [];
      const toTranslate = [];
      for (const post of updates) {
        if (translationMap[post.id]) {
          translatedList.push(translationMap[post.id]);
        } else {
          // If no translation exists, fallback to English post so it doesn't disappear
          translatedList.push(post);
          toTranslate.push(post);
        }
      }
      
      // BACKGROUND TRANSLATION & STORE (Fire and Forget)
      if (toTranslate.length > 0) {
        console.log(`[Auto-Translate] Background translating ${toTranslate.length} posts to ${targetLang}...`);
        (async () => {
          for (const post of toTranslate) {
            try {
              // Double check to prevent duplicates
              const exists = await Update.findOne({ where: { original_id: post.id, lang: targetLang } });
              if (!exists) {
                const results = await translateBlogPost(post, [targetLang]);
                if (results && results[0]) {
                  let finalContent = results[0].content;
                  
                  // Append Localized Contact Block
                  if (targetLang === 'hi') {
                    finalContent += "\n\n<p><strong>क्या आप धोलेरा स्मार्ट सिटी में निवेश करने के लिए तैयार हैं?</strong></p>\n<p>विशेषज्ञ मार्गदर्शन के लिए <a href=\"https://dholeraplatform.com/contact\">dholeraplatform.com/contact</a> पर आज ही हमसे संपर्क करें, या सीधे <a href=\"https://wa.me/917435808031\">+91 7435808031</a> पर हमें WhatsApp करें।</p>";
                  } else if (targetLang === 'gu') {
                    finalContent += "\n\n<p><strong>શું તમે ધોલેરા સ્માર્ટ સિટીમાં રોકાણ કરવા માટે તૈયાર છો?</strong></p>\n<p>નિષ્ણાત માર્ગદર્શન માટે <a href=\"https://dholeraplatform.com/contact\">dholeraplatform.com/contact</a> પર આજે જ અમારો સંપર્ક કરો અથવા સીધો <a href=\"https://wa.me/917435808031\">+91 7435808031</a> પર અમને WhatsApp કરો.</p>";
                  }

                  await Update.create({
                    title: results[0].title,
                    content: finalContent,
                    category: post.category,
                    lang: targetLang,
                    original_id: post.id,
                    published: true,
                    publishedAt: post.publishedAt,
                    imageUrl: post.imageUrl,
                    author: post.author,
                    tags: post.tags,
                    seoTitle: post.seoTitle,
                    seoDescription: post.seoDescription,
                    seoKeywords: post.seoKeywords
                  });
                  console.log(`[Auto-Translate] Stored translation for post ${post.id}`);
                }
              }
            } catch (err) {
              console.error(`[Auto-Translate Error] Post ${post.id}:`, err.message);
            }
          }
        })();
      }
      
      updates = translatedList;
    }

    // Mask the IDs so the frontend always links to the canonical English ID
    const responseData = updates.map(u => {
      const plain = typeof u.toJSON === 'function' ? u.toJSON() : u;
      if (plain.original_id) {
        plain.id = plain.original_id;
      }
      return plain;
    });

    res.json(responseData);
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

    // NEW: Reject direct access to surrogate translated IDs to prevent URL bypassing
    if (update.original_id !== null) {
      return res.status(404).json({ error: 'Translations cannot be accessed directly by ID. Use ?lang= on the canonical ID.' });
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
                 imageUrl: original.imageUrl,
                 author: original.author,
                 tags: original.tags,
                 seoTitle: original.seoTitle,
                 seoDescription: original.seoDescription,
                 seoKeywords: original.seoKeywords
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
    const { title, content, category, published, imageUrl, imagePosition, publishedAt, author, tags, seoTitle, seoDescription, seoKeywords } = req.body;
    
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
      content: cleanHtml(content, 50000),
      category: cleanText(category, 100) || 'General',
      published: published === 'true' || published === true || published === '1',
      imageUrl: finalImageUrl,
      imagePosition: imagePosition || 'top',
      publishedAt: publishedAt || new Date(),
      author: author || null,
      tags: tags || null,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      seoKeywords: seoKeywords || null
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

    const { title, content, category, published, imageUrl, imagePosition, publishedAt, author, tags, seoTitle, seoDescription, seoKeywords } = req.body;
    
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
      content: content !== undefined ? cleanHtml(content, 50000) : update.content,
      category: category !== undefined ? (cleanText(category, 100) || 'General') : update.category,
      published: published !== undefined ? (published === 'true' || published === true || published === '1') : update.published,
      imageUrl: finalImageUrl,
      imagePosition: imagePosition !== undefined ? imagePosition : update.imagePosition,
      publishedAt: publishedAt !== undefined ? publishedAt : update.publishedAt,
      author: author !== undefined ? author : update.author,
      tags: tags !== undefined ? tags : update.tags,
      seoTitle: seoTitle !== undefined ? seoTitle : update.seoTitle,
      seoDescription: seoDescription !== undefined ? seoDescription : update.seoDescription,
      seoKeywords: seoKeywords !== undefined ? seoKeywords : update.seoKeywords
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
