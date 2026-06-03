const sequelize = require('../config/database');
const Lead = require('./Lead');
const Update = require('./Update');
const Analytics = require('./Analytics');
const PdfDocument = require('./PdfDocument');
const PdfView = require('./PdfView');
const PdfPurchase = require('./PdfPurchase');
const WhatsAppLog = require('./WhatsAppLog');
const Setting = require('./Setting');
const ClearanceModel = require('./ClearanceModel');

// Define Relationships
Lead.hasMany(PdfView, { foreignKey: 'lead_id' });
PdfView.belongsTo(Lead, { foreignKey: 'lead_id' });

Lead.hasMany(WhatsAppLog, { foreignKey: 'lead_id' });
WhatsAppLog.belongsTo(Lead, { foreignKey: 'lead_id' });

PdfDocument.hasMany(PdfView, { foreignKey: 'pdf_id' });
PdfView.belongsTo(PdfDocument, { foreignKey: 'pdf_id' });

Lead.hasMany(PdfPurchase, { foreignKey: 'lead_id' });
PdfPurchase.belongsTo(Lead, { foreignKey: 'lead_id' });

PdfDocument.hasMany(PdfPurchase, { foreignKey: 'pdf_id' });
PdfPurchase.belongsTo(PdfDocument, { foreignKey: 'pdf_id' });

Lead.hasMany(ClearanceModel, { foreignKey: 'LeadId' });
ClearanceModel.belongsTo(Lead, { foreignKey: 'LeadId' });

module.exports = {
  sequelize,
  Lead,
  Update,
  Analytics,
  PdfDocument,
  PdfView,
  PdfPurchase,
  WhatsAppLog,
  Setting,
  ClearanceModel
};
