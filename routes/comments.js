const express = require('express');
const router = express.Router();
const commentsController = require('../controllers/commentsController');

// POST a new comment
router.post('/', commentsController.createComment);

// GET comments for a specific post
router.get('/:updateId', commentsController.getPublicComments);

// GET all comments for admin
router.get('/admin/all', commentsController.adminGetComments);

// PATCH moderate comment
router.patch('/admin/:id', commentsController.adminModerateComment);

module.exports = router;
