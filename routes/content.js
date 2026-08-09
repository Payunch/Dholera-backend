const express = require('express');
const router = express.Router();
const { Project, TpMap, Portal } = require('../models');
const { verifyToken } = require('./auth');

// --- PROJECTS ---

// GET all projects
router.get('/projects', async (req, res) => {
  try {
    const projects = await Project.findAll({ order: [['createdAt', 'DESC']] });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: 'Unable to complete this action right now.' });
  }
});

// GET single project by slug
router.get('/projects/:slug', async (req, res) => {
  try {
    const project = await Project.findOne({ where: { slug: req.params.slug } });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: 'Unable to complete this action right now.' });
  }
});

// POST create project (Admin)
router.post('/projects', verifyToken, async (req, res) => {
  try {
    const project = await Project.create(req.body);
    res.status(201).json({ success: true, project });
  } catch (err) {
    res.status(500).json({ error: 'Unable to complete this action right now.' });
  }
});

// PUT update project (Admin)
router.put('/projects/:id', verifyToken, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    await project.update(req.body);
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ error: 'Unable to complete this action right now.' });
  }
});

// DELETE project (Admin)
router.delete('/projects/:id', verifyToken, async (req, res) => {
  try {
    const project = await Project.findByPk(req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    await project.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Unable to complete this action right now.' });
  }
});

// --- TP MAPS ---

// GET all TP Maps
router.get('/tp-maps', async (req, res) => {
  try {
    const maps = await TpMap.findAll({ order: [['tp_id', 'ASC']] });
    res.json(maps);
  } catch (err) {
    res.status(500).json({ error: 'Unable to complete this action right now.' });
  }
});

// POST create TP Map (Admin)
router.post('/tp-maps', verifyToken, async (req, res) => {
  try {
    const map = await TpMap.create(req.body);
    res.status(201).json({ success: true, map });
  } catch (err) {
    res.status(500).json({ error: 'Unable to complete this action right now.' });
  }
});

// PUT update TP Map (Admin)
router.put('/tp-maps/:id', verifyToken, async (req, res) => {
  try {
    const map = await TpMap.findByPk(req.params.id);
    if (!map) return res.status(404).json({ error: 'Map not found' });
    await map.update(req.body);
    res.json({ success: true, map });
  } catch (err) {
    res.status(500).json({ error: 'Unable to complete this action right now.' });
  }
});

// DELETE TP Map (Admin)
router.delete('/tp-maps/:id', verifyToken, async (req, res) => {
  try {
    const map = await TpMap.findByPk(req.params.id);
    if (!map) return res.status(404).json({ error: 'Map not found' });
    await map.destroy();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Unable to complete this action right now.' });
  }
});

// --- PORTALS ---

// GET all Portals
router.get('/portals', async (req, res) => {
  try {
    const portals = await Portal.findAll({ order: [['id', 'ASC']] });
    res.json(portals);
  } catch (err) {
    res.status(500).json({ error: 'Unable to complete this action right now.' });
  }
});

module.exports = router;

