const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Update = sequelize.define('Update', {
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'General'
  },
  imageUrl: {
    type: DataTypes.STRING,
    allowNull: true
  },
  imagePosition: {
    type: DataTypes.ENUM('top', 'bottom', 'none'),
    allowNull: false,
    defaultValue: 'top'
  },
  published: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
});

module.exports = Update;
