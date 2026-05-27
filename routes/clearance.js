const express = require('express');
const router = express.Router();
const { ClearanceModel, Lead } = require('../models');

const extractToken = (authHeader = '') => {
  if (!authHeader) return '';
  if (authHeader.toLowerCase().startsWith('bearer ')) return authHeader.slice(7).trim();
  return authHeader.trim();
};

// POST /api/clearance/save - Save a new clearance model
router.post('/save', async (req, res) => {
  try {
    const { projectName, modelType, configurationData, LeadId, status } = req.body;

    if (!modelType || !configurationData) {
      return res.status(400).json({ error: 'modelType and configurationData are required' });
    }

    const clearance = await ClearanceModel.create({
      projectName,
      modelType,
      configurationData,
      LeadId: LeadId || null,
      status: status || 'Draft'
    });

    res.status(201).json({ message: 'Clearance model saved successfully', data: clearance });
  } catch (error) {
    console.error('Error saving clearance model:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/clearance/my-models - Retrieve models for a user
router.get('/my-models', async (req, res) => {
  try {
    const { leadId } = req.query;
    const leadToken = extractToken(req.headers['authorization']);
    
    let whereClause = {};
    if (leadId) {
      whereClause.LeadId = leadId;
    } else if (leadToken) {
      const lead = await Lead.findOne({ where: { lead_token: leadToken, verified: true } });
      if (!lead) {
        return res.status(401).json({ error: 'Invalid lead token' });
      }
      whereClause.LeadId = lead.id;
    } else if (req.session && req.session.leadId) {
      whereClause.LeadId = req.session.leadId;
    } else {
      return res.status(200).json({ data: [] });
    }

    const models = await ClearanceModel.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({ data: models });
  } catch (error) {
    console.error('Error fetching clearance models:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/clearance/:id - Retrieve a specific model
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const model = await ClearanceModel.findByPk(id);

    if (!model) {
      return res.status(404).json({ error: 'Clearance model not found' });
    }

    res.status(200).json({ data: model });
  } catch (error) {
    console.error('Error fetching clearance model:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/clearance/:id - Update a specific model
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, configurationData, projectName } = req.body;
    
    const model = await ClearanceModel.findByPk(id);

    if (!model) {
      return res.status(404).json({ error: 'Clearance model not found' });
    }

    if (status) model.status = status;
    if (configurationData) model.configurationData = configurationData;
    if (projectName) model.projectName = projectName;
    
    await model.save();

    res.status(200).json({ message: 'Clearance model updated successfully', data: model });
  } catch (error) {
    console.error('Error updating clearance model:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
