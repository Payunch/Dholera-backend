const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const ClearanceModel = sequelize.define('ClearanceModel', {
  projectName: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Untitled Project'
  },
  modelType: {
    type: DataTypes.STRING,
    allowNull: false
  },
  configurationData: {
    type: DataTypes.JSON,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'Draft'
  }
});

module.exports = ClearanceModel;
