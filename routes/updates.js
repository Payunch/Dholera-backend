const express = require('express');
const router = express.Router();
const { verifyToken } = require('./auth');
const upload = require('../middleware/upload');
const updatesController = require('../controllers/updatesController');

// RECOVERY ENDPOINT
router.post('/recover-post', updatesController.recoverPost);

// MIGRATE DB ENDPOINT
router.get('/migrate-db-now', updatesController.migrateDbNow);

// GET all updates
router.get('/', updatesController.getUpdates);

// GET single update by ID
router.get('/:id', updatesController.getUpdateById);

// POST create update (Admin)
router.post('/', verifyToken, upload.single('image'), updatesController.createUpdate);

// PUT update (Admin)
router.put('/:id', verifyToken, upload.single('image'), updatesController.updateUpdate);

// DELETE update (Admin)
router.delete('/:id', verifyToken, updatesController.deleteUpdate);

// POST one-time seed for production without shell access
router.post('/seed/discover-dholera', updatesController.seedDiscoverDholera);

module.exports = router;
