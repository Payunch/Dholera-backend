const express = require('express');
const router = express.Router();
const { Project, TpMap } = require('../models');

// GET all projects
router.get('/projects', async (req, res) => {
  try {
    const projects = await Project.findAll({
      order: [['createdAt', 'DESC']]
    });
    res.json(projects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET single project by slug
router.get('/projects/:slug', async (req, res) => {
  try {
    const project = await Project.findOne({
      where: { slug: req.params.slug }
    });
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET all TP Maps
router.get('/tp-maps', async (req, res) => {
  try {
    const maps = await TpMap.findAll({
      order: [['tp_id', 'ASC']]
    });
    res.json(maps);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
