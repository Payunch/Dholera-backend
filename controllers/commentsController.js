const { Comment } = require('../models');
const crypto = require('crypto');
const { cleanText } = require('../utils/sanitize');

// Rate limiting map (in memory)
// In production, consider Redis, but an in-memory map is fine for SQLite level traffic
const ipRequests = new Map();

exports.createComment = async (req, res) => {
  try {
    const { updateId, authorName, authorEmail, body, honeypot } = req.body;
    
    // 1. Spam Filter (Honeypot)
    if (honeypot && honeypot.length > 0) {
      // Bot filled out hidden field
      return res.status(200).json({ success: true }); // Fake success
    }

    if (!updateId || !authorName || !body) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 2. Spam Filter (External Links Regex)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    if (urlRegex.test(body)) {
      return res.status(400).json({ error: 'External links are not allowed in comments.' });
    }

    // 3. Rate Limiting (2 comments per 5 minutes per IP)
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const ipHash = crypto.createHash('sha256').update(ip).digest('hex');
    
    const now = Date.now();
    const windowMs = 5 * 60 * 1000;
    
    let history = ipRequests.get(ipHash) || [];
    history = history.filter(time => now - time < windowMs);
    
    if (history.length >= 2) {
      return res.status(429).json({ error: 'Too many comments submitted. Please wait 5 minutes.' });
    }
    
    history.push(now);
    ipRequests.set(ipHash, history);

    // 4. Sanitize and Insert
    const sanitizedBody = cleanText(body).substring(0, 1000);
    const sanitizedName = cleanText(authorName).substring(0, 50);
    const sanitizedEmail = authorEmail ? cleanText(authorEmail).substring(0, 255) : null;

    const comment = await Comment.create({
      update_id: updateId,
      author_name: sanitizedName,
      author_email: sanitizedEmail,
      content: sanitizedBody,
      status: 'pending',
      ip_hash: ipHash
    });

    res.status(201).json({ success: true, message: 'Comment submitted and is pending moderation.' });
  } catch (error) {
    console.error('[CreateComment Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getPublicComments = async (req, res) => {
  try {
    const { updateId } = req.params;
    const comments = await Comment.findAll({
      where: { update_id: updateId, status: 'approved' },
      attributes: ['id', 'author_name', 'content', 'createdAt'],
      order: [['createdAt', 'DESC']]
    });
    
    res.json({ data: comments });
  } catch (error) {
    console.error('[GetComments Error]', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.adminGetComments = async (req, res) => {
  try {
    const comments = await Comment.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json({ data: comments });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.adminModerateComment = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'approved', 'rejected', 'spam'
    
    const comment = await Comment.findByPk(id);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    
    comment.status = status;
    await comment.save();
    
    res.json({ success: true, data: comment });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};
