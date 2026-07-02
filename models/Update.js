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
  },
  publishedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  lang: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'en'
  },
  original_id: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  author: {
    type: DataTypes.STRING,
    allowNull: true
  },
  tags: {
    type: DataTypes.STRING,
    allowNull: true
  },
  seoTitle: {
    type: DataTypes.STRING,
    allowNull: true
  },
  seoDescription: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  seoKeywords: {
    type: DataTypes.STRING,
    allowNull: true
  },
  portal_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Portals',
      key: 'id'
    }
  }
});

module.exports = Update;
