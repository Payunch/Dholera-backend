const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const UserSession = sequelize.define('UserSession', {
  username: {
    type: DataTypes.STRING,
    allowNull: false
  },
  ip: {
    type: DataTypes.STRING,
    allowNull: true
  },
  userAgent: {
    type: DataTypes.STRING,
    allowNull: true
  },
  loginAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  logoutAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  duration: {
    type: DataTypes.INTEGER, // in seconds
    allowNull: true
  }
});

module.exports = UserSession;
