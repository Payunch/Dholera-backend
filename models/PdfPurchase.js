const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const PdfPurchase = sequelize.define('PdfPurchase', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  lead_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  pdf_id: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  amount: {
    type: DataTypes.INTEGER, // in paise (1000 = 10 INR)
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'INR'
  },
  transaction_id: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  gateway_payment_id: {
    type: DataTypes.STRING,
    allowNull: true
  },
  gateway_signature: {
    type: DataTypes.STRING,
    allowNull: true
  },
  status: {
    type: DataTypes.STRING, // 'pending', 'completed', 'failed'
    defaultValue: 'pending'
  },
  type: {
    type: DataTypes.STRING, // 'view', 'download'
    defaultValue: 'view'
  }
});

module.exports = PdfPurchase;
