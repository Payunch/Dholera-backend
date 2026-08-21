const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Keeps an auditable record of every automatic-blog attempt. Runtime logs are
// ephemeral on most hosts, so they cannot be the only source of truth.
const AutoBlogRun = sequelize.define('AutoBlogRun', {
  startedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'running'
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  updateId: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
});

module.exports = AutoBlogRun;
