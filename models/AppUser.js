const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const AppUser = sequelize.define('AppUser', {
  name: { type: DataTypes.STRING(120), allowNull: false },
  phone: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  email: { type: DataTypes.STRING(255), allowNull: false, unique: true },
  password_hash: { type: DataTypes.STRING(255), allowNull: false },
  last_login_at: { type: DataTypes.DATE, allowNull: true },
  last_login_ip: { type: DataTypes.STRING(64), allowNull: true },
  last_login_user_agent: { type: DataTypes.TEXT, allowNull: true },
  last_failed_login_at: { type: DataTypes.DATE, allowNull: true },
  failed_login_attempts: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  locked_until: { type: DataTypes.DATE, allowNull: true },
  signup_ip: { type: DataTypes.STRING(64), allowNull: true },
  signup_user_agent: { type: DataTypes.TEXT, allowNull: true },
  accepted_terms_at: { type: DataTypes.DATE, allowNull: true },
  accepted_privacy_at: { type: DataTypes.DATE, allowNull: true }
}, {
  // The existing production AppUsers table has required createdAt/updatedAt
  // columns, so Sequelize must populate them on insert/update.
  timestamps: true,
});

module.exports = AppUser;
