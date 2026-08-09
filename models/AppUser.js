const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AppUser = sequelize.define('AppUser', {
  name: { type: DataTypes.STRING(120), allowNull: false },
  phone: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  password_hash: { type: DataTypes.STRING(255), allowNull: false },
  last_login_at: { type: DataTypes.DATE, allowNull: true }
});

module.exports = AppUser;
