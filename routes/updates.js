const express = require('express');
const router = express.Router();
const { verifyToken } = require('./auth');
const upload = require('../middleware/upload');
const updatesController = require('../controllers/updatesController');

// RECOVERY ENDPOINT — Admin only
router.post('/recover-post', verifyToken, updatesController.recoverPost);

// MIGRATE DB ENDPOINT — Admin only (was publicly accessible — CRITICAL FIX)
router.get('/migrate-db-now', verifyToken, updatesController.migrateDbNow);

// TEMPORARY FIX ROUTE FOR LIVE SERVER
router.get('/fix-live', verifyToken, updatesController.fixLiveServer);

// GET all updates (public — intentional)
router.get('/', updatesController.getUpdates);

// GET single update by ID (public — intentional)
router.get('/:id', updatesController.getUpdateById);

// POST create update (Admin)
router.post('/', verifyToken, upload.single('image'), updatesController.createUpdate);

// PUT update (Admin)
router.put('/:id', verifyToken, upload.single('image'), updatesController.updateUpdate);

// DELETE update (Admin)
router.delete('/:id', verifyToken, updatesController.deleteUpdate);

// POST one-time seed — Admin only
router.post('/seed/discover-dholera', verifyToken, updatesController.seedDiscoverDholera);

module.exports = router;
