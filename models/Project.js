const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Project = sequelize.define('Project', {
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.ENUM('Residential', 'Commercial', 'Industrial'),
    allowNull: false
  },
  taglineKey: {
    type: DataTypes.STRING,
    allowNull: false
  },
  descKey: {
    type: DataTypes.STRING,
    allowNull: false
  },
  plotSizes: {
    type: DataTypes.STRING,
    allowNull: true
  },
  offering: {
    type: DataTypes.STRING,
    allowNull: true
  },
  roadWidth: {
    type: DataTypes.STRING,
    allowNull: true
  },
  zoning: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING,
    allowNull: true
  },
  reraApproved: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  mapUrl: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  whatsappText: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING,
    allowNull: true
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

module.exports = Project;
