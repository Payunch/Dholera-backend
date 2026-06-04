const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TpMap = sequelize.define('TpMap', {
  tp_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  area: {
    type: DataTypes.STRING,
    allowNull: false
  },
  focus: {
    type: DataTypes.STRING,
    allowNull: false
  },
  badges: {
    type: DataTypes.JSON, // Array of { text, type }
    allowNull: true,
    defaultValue: []
  }
});

module.exports = TpMap;
