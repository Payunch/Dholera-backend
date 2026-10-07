const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Comment = sequelize.define('Comment', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  update_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  author_name: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  author_email: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'spam', 'rejected'),
    allowNull: false,
    defaultValue: 'pending',
  },
  ip_hash: {
    type: DataTypes.STRING,
    allowNull: true,
  }
}, {
  tableName: 'Comments',
  timestamps: true,
});

module.exports = Comment;
