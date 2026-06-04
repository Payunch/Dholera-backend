const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Translation = sequelize.define('Translation', {
  key: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: 'translation_unique_key'
  },
  lang: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: 'translation_unique_key'
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: false
  }
});

module.exports = Translation;
