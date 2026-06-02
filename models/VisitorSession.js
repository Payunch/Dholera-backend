const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const VisitorSession = sequelize.define('VisitorSession', {
  sessionId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  timeSpent: {
    type: DataTypes.INTEGER, // in seconds
    defaultValue: 0
  },
  visitedPages: {
    type: DataTypes.TEXT, // Storing as JSON string array
    defaultValue: '[]'
  },
  source: {
    type: DataTypes.TEXT, // Using TEXT for long referrers
    allowNull: true
  },
  deviceType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  browserFingerprint: {
    type: DataTypes.STRING(500), // Increase just in case
    allowNull: true
  },
  ip: {
    type: DataTypes.STRING(500), // Handle long x-forwarded-for chains
    allowNull: true
  }
});

module.exports = VisitorSession;
