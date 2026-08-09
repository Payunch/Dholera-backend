const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PasswordResetOtp = sequelize.define('PasswordResetOtp', {
  user_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  code_hash: { type: DataTypes.STRING(64), allowNull: false },
  expires_at: { type: DataTypes.DATE, allowNull: false },
  attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 }
});

module.exports = PasswordResetOtp;
