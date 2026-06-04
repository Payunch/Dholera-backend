const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Translation = sequelize.define('Translation', {
  key: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lang: {
    type: DataTypes.STRING,
    allowNull: false
  },
  value: {
    type: DataTypes.TEXT,
    allowNull: false
  }
}, {
  indexes: [
    {
      unique: true,
      fields: ['key', 'lang']
    }
  ]
});

module.exports = Translation;
