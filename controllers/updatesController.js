const { Update } = require('../models');
const { Op } = require('sequelize');
const { cleanText, cleanHtml } = require('../utils/sanitize');
const { getPremiumBlogPosts } = require('../utils/discoverDholeraPost');
const { sendInvestorNotification } = require('../services/notificationService');
const { translateBlogPost } = require('../services/translationService');
const { reviewBlogForSeo, verifyManualBlogWithGeminiFree } = require('../services/seoReviewService');
const path = require('path');

const isRemotePath = (p) => p.startsWith('http://') || p.startsWith('https://');

exports.recoverPost = async (req, res) => {
  try {
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
    console.error('[updatesController.recoverPost]', err);
    res.status(500).json({ error: 'Unable to complete this action right now.' });
  }
};

exports.migrateDbNow = async (req, res) => {
  try {
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
    console.error('[updatesController.migrateDbNow]', err);
    res.status(500).json({ error: 'Unable to complete this action right now.' });
  }
};

exports.getUpdates = async (req, res) => {
  try {
    const { search, lang, audience } = req.query;
    const targetLang = lang || 'en';
    const where = {};
    const includeAll = req.path === '/admin/all';
    const exclusiveOnly = (req.query.exclusive || '').toString().toLowerCase() === 'true';
    
    // The public route must never reveal drafts. The admin-only route above is
    // protected by verifyToken and is the sole way to include all posts.
    if (!includeAll) {
      where.published = true;
      where.isApproved = true;

      const targetAudience = (audience || 'web').toString().toLowerCase();
      if (targetAudience === 'web') {
        where.isExclusive = false;
      }
    }

    if (exclusiveOnly) {
      where.isExclusive = true;
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

    // If requested language is not English, replace English titles/contents with translations where available
    if (targetLang !== 'en') {
      // Find all translations for the requested language
      const translations = await Update.findAll({
        where: { lang: targetLang, original_id: { [Op.not]: null } }
      });
      const translationMap = {};
      translations.forEach(t => { translationMap[t.original_id] = t; });

      updates = updates.map(update => {
        const translated = translationMap[update.id];
        if (translated) {
          // Merge translated fields onto the original object structure
          return {
            ...update.toJSON(),
            title: translated.title,
            content: translated.content,
            lang: translated.lang,
            translated_id: translated.id // Provide reference to the actual translation row
          };
        }
        return update; // Fallback to English if translation missing
      });
    }

    res.json(updates);
  } catch (err) {
    console.error('[updatesController.getUpdates]', err);
    res.status(500).json({ error: 'Unable to load updates right now.' });
  }
};

exports.getUpdateById = async (req, res) => {
  try {
    const { all, lang, audience } = req.query;
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
             const results = await translateBlogPost(original.toJSON(), [targetLang]);
             if (results && results[0] && results[0].content && results[0].title) {
               translated = await Update.create({
                 title: results[0].title,
                 content: results[0].content,
                 category: original.category,
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
             } else {
               console.error(`[Fallback] Translation failed or returned empty content for post ${original.id} to ${targetLang}`);
             }
           }
         } catch (e) {
           console.error(`[Fallback] Error during auto-translate for post ${originalId} to ${targetLang}:`, e.message);
         }
      }
      if (translated) update = translated;
    }

    // Only show if published unless 'all' is true
    if (all !== 'true' && !update.published) {
      return res.status(404).json({ error: 'Update not found' });
    }

    const targetAudience = (audience || 'web').toString().toLowerCase();
    const exclusiveOnly = (req.query.exclusive || '').toString().toLowerCase() === 'true';
    if (all !== 'true' && targetAudience === 'web' && update.isExclusive) {
      return res.status(404).json({ error: 'Update not found' });
    }
    if (exclusiveOnly && !update.isExclusive) {
      return res.status(404).json({ error: 'Update not found' });
    }

    res.json(update);
  } catch (err) {
    console.error('[updatesController.getUpdateById]', err);
    res.status(500).json({ error: 'Unable to load this update right now.' });
  }
};

exports.createUpdate = async (req, res) => {
  try {
    const { title, content, category, published, isExclusive, imageUrl, imagePosition, publishedAt, author, tags, seoTitle, seoDescription, seoKeywords, slug, imageAltText, imageTitle } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    let finalImageUrl = cleanText(imageUrl, 500) || null;

    // --- GEMINI AI CONTENT MODERATION (SAFE HARBOR) ---
    // If the author is explicitly set (e.g. a user or agent upload) OR we just want to protect all inputs:
    const verification = await verifyManualBlogWithGeminiFree(title, content);
    const isApproved = verification.verified;
    
    // --- GEMINI AI SEO REVIEW GUARD ---
    let finalPublished = false;
    let seoBlockedScore = null;
    const requestedPublish = published === 'true' || published === true || published === '1';
    
    if (isApproved && requestedPublish) {
      const seoReview = await reviewBlogForSeo({ title, content, category, seoTitle, seoDescription, slug, imageAltText, tags });
      if (seoReview.estimatedScore >= 90) {
        finalPublished = true;
      } else {
        console.warn(`[SEO Guard] Blocked publish. Score: ${seoReview.estimatedScore}`);
        finalPublished = false;
        seoBlockedScore = seoReview.estimatedScore;
      }
    }
    
    if (!isApproved) {
      console.warn(`[Content Moderation] Blocked/Flagged Upload. Reason: ${verification.reason}`);
    }

    if (req.file) {
      const filePath = req.file.secure_url || req.file.path;
      if (isRemotePath(filePath)) {
        finalImageUrl = filePath;
      } else {
        const uploadsBase = path.resolve(__dirname, '..');
        finalImageUrl = '/' + path.relative(uploadsBase, filePath).replace(/\\/g, '/');
      }
    }

    const update = await Update.create({
      title: cleanText(title, 255),
      content: cleanHtml(content, 50000),
      category: cleanText(category, 100) || 'General',
      published: finalPublished,
      isApproved: isApproved,
      isExclusive: isExclusive === 'true' || isExclusive === true || isExclusive === '1',
      imageUrl: finalImageUrl,
      imagePosition: imagePosition || 'top',
      publishedAt: publishedAt || new Date(),
      author: author || null,
      tags: tags || null,
      seoTitle: seoTitle || null,
      seoDescription: seoDescription || null,
      seoKeywords: seoKeywords || null,
      slug: cleanText(slug, 120) || null,
      imageAltText: cleanText(imageAltText, 255) || null,
      imageTitle: cleanText(imageTitle, 255) || null
    });

    if (update.published) {
      await sendInvestorNotification(
        'New Market Insight',
        update.title,
        { type: 'insight', id: update.id.toString() }
      );
    }

    if (seoBlockedScore) {
      res.status(200).json({
        success: true,
        published: false,
        seoScore: seoBlockedScore,
        message: "Saved as draft. Publishing requires an SEO score of 90 or above.",
        data: update
      });
    } else {
      res.status(201).json(update);
    }
  } catch (err) {
    console.error('[updatesController.createUpdate]', err);
    res.status(500).json({ error: 'Unable to create the update right now.' });
  }
};

exports.updateUpdate = async (req, res) => {
  try {
    const update = await Update.findByPk(req.params.id);
    if (!update) return res.status(404).json({ error: 'Update not found' });
    const wasPublished = Boolean(update.published && update.isApproved);

    const { title, content, category, published, isApproved, isExclusive, imageUrl, imagePosition, publishedAt, author, tags, seoTitle, seoDescription, seoKeywords, slug, imageAltText, imageTitle } = req.body;
    
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

    // Determine final values considering isApproved
    const parsedIsApproved = isApproved !== undefined ? (isApproved === 'true' || isApproved === true || isApproved === '1') : update.isApproved;
    const parsedPublished = published !== undefined ? (published === 'true' || published === true || published === '1') : update.published;
    const parsedIsExclusive = isExclusive !== undefined ? (isExclusive === 'true' || isExclusive === true || isExclusive === '1') : update.isExclusive;
    
    // --- GEMINI AI SEO REVIEW GUARD ---
    let finalPublished = false;
    let seoBlockedScore = null;
    if (parsedIsApproved && parsedPublished) {
      const seoReview = await reviewBlogForSeo({ 
        title: title !== undefined ? title : update.title, 
        content: content !== undefined ? content : update.content, 
        category: category !== undefined ? category : update.category, 
        seoTitle: seoTitle !== undefined ? seoTitle : update.seoTitle, 
        seoDescription: seoDescription !== undefined ? seoDescription : update.seoDescription, 
        slug: slug !== undefined ? slug : update.slug, 
        imageAltText: imageAltText !== undefined ? imageAltText : update.imageAltText, 
        tags: tags !== undefined ? tags : update.tags 
      });
      if (seoReview.estimatedScore >= 90) {
        finalPublished = true;
      } else {
        console.warn(`[SEO Guard] Update blocked publish. Score: ${seoReview.estimatedScore}`);
        finalPublished = false;
        seoBlockedScore = seoReview.estimatedScore;
      }
    }

    await update.update({
      title: title !== undefined ? cleanText(title, 255) : update.title,
      content: content !== undefined ? cleanHtml(content, 50000) : update.content,
      category: category !== undefined ? (cleanText(category, 100) || 'General') : update.category,
      published: finalPublished,
      isApproved: parsedIsApproved,
      isExclusive: parsedIsExclusive,
      imageUrl: finalImageUrl,
      imagePosition: imagePosition !== undefined ? imagePosition : update.imagePosition,
      publishedAt: publishedAt !== undefined ? publishedAt : update.publishedAt,
      author: author !== undefined ? author : update.author,
      tags: tags !== undefined ? tags : update.tags,
      seoTitle: seoTitle !== undefined ? seoTitle : update.seoTitle,
      seoDescription: seoDescription !== undefined ? seoDescription : update.seoDescription,
      seoKeywords: seoKeywords !== undefined ? seoKeywords : update.seoKeywords,
      slug: slug !== undefined ? cleanText(slug, 120) || null : update.slug,
      imageAltText: imageAltText !== undefined ? cleanText(imageAltText, 255) || null : update.imageAltText,
      imageTitle: imageTitle !== undefined ? cleanText(imageTitle, 255) || null : update.imageTitle
    });

    const isNowPublished = Boolean(update.published && update.isApproved);
    if (!wasPublished && isNowPublished) {
      await sendInvestorNotification(
        'New Market Insight',
        update.title,
        { type: 'insight', id: update.id.toString() }
      );
    }

    if (seoBlockedScore) {
      res.status(200).json({
        success: true,
        published: false,
        seoScore: seoBlockedScore,
        message: "Saved as draft. Publishing requires an SEO score of 90 or above.",
        data: update
      });
    } else {
      res.json(update);
    }
  } catch (err) {
    console.error('[updatesController.updateUpdate]', err);
    res.status(500).json({ error: 'Unable to update the post right now.' });
  }
};

exports.deleteUpdate = async (req, res) => {
  try {
    const update = await Update.findByPk(req.params.id);
    if (!update) return res.status(404).json({ error: 'Update not found' });
    await update.destroy();
    res.json({ message: 'Update deleted' });
  } catch (err) {
    console.error('[updatesController.deleteUpdate]', err);
    res.status(500).json({ error: 'Unable to delete the post right now.' });
  }
};

exports.fixLiveServer = async (req, res) => {
  try {
    // 1. Fix old blogs
    await Update.update({ isApproved: true }, { where: { published: true } });
    
    // 2. Run auto blog right now (in background)
    const autoBlogService = require('../services/autoBlogService');
    autoBlogService.runDaily().catch(e => console.error(e));

    res.json({ message: 'Live Server Fixed! Old blogs approved, and today\'s auto-blog is generating in the background.' });
  } catch (err) {
    console.error('[updatesController.fixLiveServer]', err);
    res.status(500).json({ error: 'Unable to complete this action right now.' });
  }
};

exports.seedDiscoverDholera = async (req, res) => {
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
    console.error('[updatesController.seedDiscoverDholera]', err);
    return res.status(500).json({ error: 'Unable to seed posts right now.' });
  }
};
