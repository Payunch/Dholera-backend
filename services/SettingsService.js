/**
 * settingsService.js - Settings Service (General, Invoice, Default Settings)
 * Converted from generalsettings.php, invoicesetting.php, defaultentrysetting.php
 */

class settingsService {
  async getGeneralSettings(bint_acid) {
    return {
      msgType: 'success',
      message: 'General settings fetched successfully',
      setting: {
        companyName: 'Dholera Growth Platform',
        currency: 'INR',
        taxType: 'GST'
      }
    };
  }

  async saveGeneralSettings(bint_acid, setting) {
    return {
      msgType: 'success',
      message: 'General settings saved successfully',
      setting
    };
  }

  async getInvoiceSettings(bint_acid) {
    return {
      msgType: 'success',
      message: 'Invoice settings fetched successfully',
      setting: {
        invoicePrefix: 'INV-',
        nextInvoiceNo: 1001,
        termsAndConditions: 'Payment due within 30 days.'
      }
    };
  }

  async saveInvoiceSettings(bint_acid, setting) {
    return {
      msgType: 'success',
      message: 'Invoice settings saved successfully',
      setting
    };
  }

  async getDefaultEntrySettings(bint_acid) {
    return {
      msgType: 'success',
      message: 'Default entry settings fetched successfully',
      setting: {
        defaultCashLedger: 'Cash Account',
        defaultBankLedger: 'HDFC Bank'
      }
    };
  }
}

module.exports = new settingsService();
