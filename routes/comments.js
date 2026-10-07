const express = require('express');
const router = express.Router();
const { Comment, Update } = require('../models');
const Filter = require('bad-words');

const filter = new Filter();

// POST a new comment
router.post('/', async (req, res) => {
  try {
    let { update_id, author_name, content } = req.body;

    if (!update_id || !author_name || !content) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Check if post exists
    const update = await Update.findByPk(update_id);
    if (!update) {
      return res.status(404).json({ error: 'Post not found' });
    }

    let status = 'approved';

    // Profanity check
    if (filter.isProfane(content) || filter.isProfane(author_name)) {
      status = 'rejected';
      // We can also use filter.clean(content) to censor it, but standard 
      // strict moderation implies rejecting or hiding it.
      // We will save it as 'rejected' so it's not visible to users.
    }

    const comment = await Comment.create({
      update_id,
      author_name,
      content,
      status
    });

    if (status === 'rejected') {
      return res.status(400).json({ 
        error: 'Your comment was flagged for inappropriate language and will not be displayed.' 
      });
    }

    return res.status(201).json(comment);
  } catch (error) {
    console.error('[Comments] Error creating comment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET comments for a specific post
router.get('/:updateId', async (req, res) => {
  try {
    const { updateId } = req.params;

    const comments = await Comment.findAll({
      where: {
        update_id: updateId,
        status: 'approved'
      },
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'author_name', 'content', 'createdAt']
    });

    return res.json(comments);
  } catch (error) {
    console.error('[Comments] Error fetching comments:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
