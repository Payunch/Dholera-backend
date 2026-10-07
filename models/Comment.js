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
    type: DataTypes.STRING,
    allowNull: false,
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'approved', // 'approved', 'rejected', 'pending'
  }
}, {
  tableName: 'Comments',
  timestamps: true,
});

module.exports = Comment;
