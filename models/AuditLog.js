const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AuditLog = sequelize.define('AuditLog', {
  eventType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  actorType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'system'
  },
  actorId: {
    type: DataTypes.STRING,
    allowNull: true
  },
  success: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  ip: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  userAgent: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  details: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

module.exports = AuditLog;
