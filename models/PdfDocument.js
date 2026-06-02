const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PdfDocument = sequelize.define('PdfDocument', {
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  category: {
    type: DataTypes.STRING,
    allowNull: true
  },
  file_path: {
    type: DataTypes.STRING,
    allowNull: false
  },
  storage_type: {
    type: DataTypes.STRING, // 'upload', 'private', 'authenticated'
    defaultValue: 'upload'
  },
  resource_type: {
    type: DataTypes.STRING, // 'image', 'raw'
    defaultValue: 'image'
  },
  is_protected: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  documentDate: {
    type: DataTypes.DATE,
    allowNull: true
  }
});

module.exports = PdfDocument;
