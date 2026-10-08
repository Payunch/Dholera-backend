const { Update } = require('../models');
const { Op } = require('sequelize');
const { cleanText, cleanHtml } = require('../utils/sanitize');
const { getPremiumBlogPosts } = require('../utils/discoverDholeraPost');
const { sendInvestorNotification } = require('../services/notificationService');
const { translateBlogPost, generateBavaTranslations } = require('../services/translationService');
const { reviewBlogForSeo, verifyManualBlogWithGeminiFree } = require('../services/seoReviewService');
const path = require('path');

const isRemotePath = (p) => typeof p === 'string' && (p.startsWith('http://') || p.startsWith('https://'));

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

    if (targetLang !== 'en') {
      updates = updates.map(update => {
        const titleKey = `title_${targetLang}`;
        const contentKey = `content_${targetLang}`;
        
        const translatedTitle = update[titleKey];
        const translatedContent = update[contentKey];
        
        if (translatedTitle && translatedContent) {
          return {
            ...update.toJSON(),
            original_title: update.title,
            original_slug: update.slug,
            title: translatedTitle,
            content: translatedContent,
            lang: targetLang
          };
        }
        
        // Return original if translation missing (Frontend should handle English slug mismatch fallback)
        return {
          ...update.toJSON(),
          lang: targetLang // Lie to frontend so getBlogSlug expects English, preventing redirect loops! Wait, no.
        };
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

    if (targetLang !== 'en') {
      const titleKey = `title_${targetLang}`;
      const contentKey = `content_${targetLang}`;
      
      const translatedTitle = update[titleKey];
      const translatedContent = update[contentKey];

      if (translatedTitle && translatedContent) {
        const originalObj = update.toJSON();
        update = {
          ...originalObj,
          original_title: originalObj.title,
          original_slug: originalObj.slug,
          title: translatedTitle,
          content: translatedContent,
          lang: targetLang
        };
      } else {
        // Fallback to English but preserve the requested language to prevent redirect loops
        update = {
          ...update.toJSON(),
          lang: targetLang
        };
      }
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
    const { title, content, title_gu, content_gu, title_hi, content_hi, category, published, isExclusive, imageUrl, imagePosition, publishedAt, author, tags, seoTitle, seoDescription, seoKeywords, slug, imageAltText, imageTitle } = req.body;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    let finalImageUrl = cleanText(imageUrl, 500) || null;

    // --- CONTENT MODERATION (SAFE HARBOR) ---
    let isApproved = true;
    try {
      const verification = await verifyManualBlogWithGeminiFree(title, content);
      isApproved = verification.verified !== false;
    } catch (e) {
      console.warn('[Content Moderation] AI check bypassed:', e.message);
    }
    
    // --- SEO REVIEW GUARD ---
    const requestedPublish = published === 'true' || published === true || published === '1';
    let finalPublished = requestedPublish;
    
    if (requestedPublish && !(isExclusive === 'true' || isExclusive === true || isExclusive === '1')) {
      try {
        const seoReview = await reviewBlogForSeo({ title, content, category, seoTitle, seoDescription, slug, imageAltText, tags });
        if (seoReview.estimatedScore < 80) {
          console.warn(`[SEO Guard] Lower score: ${seoReview.estimatedScore}, allowing admin publish.`);
        }
      } catch (seoErr) {
        console.warn('[SEO Guard] AI review unavailable during create, proceeding:', seoErr.message);
      }
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
      title_gu: title_gu ? cleanText(title_gu, 255) : null,
      content_gu: content_gu ? cleanHtml(content_gu, 50000) : null,
      title_hi: title_hi ? cleanText(title_hi, 255) : null,
      content_hi: content_hi ? cleanHtml(content_hi, 50000) : null,
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

    // Background auto-translation into Bava Hindi & Gujarati if not provided
    if (!update.title_hi || !update.title_gu) {
      generateBavaTranslations({ title: update.title, content: update.content })
        .then(async (trans) => {
          if (trans.title_hi && trans.title_gu) {
            await update.update({
              title_hi: trans.title_hi,
              content_hi: trans.content_hi,
              title_gu: trans.title_gu,
              content_gu: trans.content_gu
            });
            console.log(`[Auto-Translate] Background generated translations for new post ID ${update.id}`);
          }
        })
        .catch(err => console.warn(`[Auto-Translate] Background translation skipped for post ID ${update.id}:`, err.message));
    }

    if (!isApproved) {
      res.status(200).json({
        success: true,
        published: false,
        moderationBlocked: true,
        message: "Saved as draft. Content requires review before publishing.",
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

    const { title, content, title_gu, content_gu, title_hi, content_hi, category, published, isApproved, isExclusive, imageUrl, imagePosition, publishedAt, author, tags, seoTitle, seoDescription, seoKeywords, slug, imageAltText, imageTitle } = req.body;
    
    let finalImageUrl = update.imageUrl;
    if (imageUrl !== undefined) {
      if (typeof imageUrl === 'string') {
        finalImageUrl = cleanText(imageUrl, 500) || null;
      } else if (!imageUrl) {
        finalImageUrl = null;
      }
    }

    if (req.file) {
      const filePath = req.file.secure_url || req.file.path;
      if (isRemotePath(filePath)) {
        finalImageUrl = filePath;
      } else if (typeof filePath === 'string') {
        const uploadsBase = path.resolve(__dirname, '..');
        finalImageUrl = '/' + path.relative(uploadsBase, filePath).replace(/\\/g, '/');
      }
    }

    // Determine final values considering isApproved
    let parsedIsApproved = isApproved !== undefined ? (isApproved === 'true' || isApproved === true || isApproved === '1') : update.isApproved;
    const parsedPublished = published !== undefined ? (published === 'true' || published === true || published === '1') : update.published;
    const parsedIsExclusive = isExclusive !== undefined ? (isExclusive === 'true' || isExclusive === true || isExclusive === '1') : update.isExclusive;
    
    // Admin edits are direct and fast
    let finalPublished = parsedPublished;

    await update.update({
      title: title !== undefined ? cleanText(title, 255) : update.title,
      content: content !== undefined ? cleanHtml(content, 50000) : update.content,
      title_gu: title_gu !== undefined ? (title_gu ? cleanText(title_gu, 255) : null) : update.title_gu,
      content_gu: content_gu !== undefined ? (content_gu ? cleanHtml(content_gu, 50000) : null) : update.content_gu,
      title_hi: title_hi !== undefined ? (title_hi ? cleanText(title_hi, 255) : null) : update.title_hi,
      content_hi: content_hi !== undefined ? (content_hi ? cleanHtml(content_hi, 50000) : null) : update.content_hi,
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
      
      try {
        const { pushIndexUrl } = require('../scripts/googleIndexing');
        
        // Generate the slug (this matches the frontend getBlogSlug logic)
        let slugStr = update.slug;
        if (!slugStr) {
          slugStr = (update.title || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
        }
        
        const frontendUrl = `https://www.dholeraplatform.com/blogs/${slugStr}`;
        await pushIndexUrl(frontendUrl);
      } catch (e) {
        console.error('[Google Indexing] Failed to push:', e);
      }
    }

    // Background auto-translation into Bava Hindi & Gujarati if missing or requested
    if ((!update.title_hi || !update.title_gu) || (req.body.autoTranslate === 'true')) {
      generateBavaTranslations({ title: update.title, content: update.content })
        .then(async (trans) => {
          if (trans.title_hi && trans.title_gu) {
            await update.update({
              title_hi: trans.title_hi,
              content_hi: trans.content_hi,
              title_gu: trans.title_gu,
              content_gu: trans.content_gu
            });
            console.log(`[Auto-Translate] Background updated translations for post ID ${update.id}`);
          }
        })
        .catch(err => console.warn(`[Auto-Translate] Background translation skipped for post ID ${update.id}:`, err.message));
    }

    if (!parsedIsApproved) {
      res.status(200).json({
        success: true,
        published: false,
        moderationBlocked: true,
        message: "Saved as draft. Content requires review before publishing.",
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
