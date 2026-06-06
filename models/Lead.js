const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Lead = sequelize.define('Lead', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: false
  },
  source: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'Website'
  },
  timeSpent: {
    type: DataTypes.INTEGER, // in seconds
    allowNull: true,
    defaultValue: 0
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'New' // New, Contacted, Converted, Follow-up, Not Interested, Closed
  },
  visited_pages: {
    type: DataTypes.TEXT, // Storing as JSON string
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  last_contacted: {
    type: DataTypes.DATE,
    allowNull: true
  },
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  returning_visitor: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  visit_count: {
    type: DataTypes.INTEGER,
    defaultValue: 1
  },
  lead_token: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  browserFingerprint: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  high_interest_whatsapp_notified_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  whatsapp_sent_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  last_whatsapp_sent: {
    type: DataTypes.DATE,
    allowNull: true
  },
  isRead: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_pro: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  preferred_language: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'en'
  },
  preferred_theme: {
    type: DataTypes.STRING,
    allowNull: true,
    defaultValue: 'light'
  },
  fcm_token: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  score: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  interest_profile: {
    type: DataTypes.TEXT, // Storing AI-generated interest analysis as JSON string
    allowNull: true
  },
  portal_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Portals',
      key: 'id'
    }
  },
});

module.exports = Lead;
