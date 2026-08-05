/**
 * routes/generalsettings.js - Settings Router
 * Converted from generalsettingsdetail.php, invoicesettingdetail.php, defaultentrysettingdetail.php
 */

const express = require('express');
const router = express.Router();
const SettingsService = require('../services/SettingsService');

router.post('/', async (req, res) => {
  try {
    const data = req.body || {};
    const { Op, bint_acid } = data;

    if (Op === 'GetGeneralSettings') {
      const result = await SettingsService.getGeneralSettings(bint_acid || 1);
      return res.json(result);
    } else if (Op === 'SaveGeneralSettings') {
      const result = await SettingsService.saveGeneralSettings(bint_acid || 1, data.setting);
      return res.json(result);
    } else if (Op === 'GetInvoiceSettings' || Op === 'GetBillSetting') {
      const result = await SettingsService.getInvoiceSettings(bint_acid || 1);
      return res.json(result);
    } else if (Op === 'SaveInvoiceSettings' || Op === 'SaveBillSetting') {
      const result = await SettingsService.saveInvoiceSettings(bint_acid || 1, data.setting);
      return res.json(result);
    } else if (Op === 'GetDefaultEntrySetting') {
      const result = await SettingsService.getDefaultEntrySettings(bint_acid || 1);
      return res.json(result);
    }

    return res.json({
      msgType: 'success',
      message: 'Settings request processed successfully'
    });
  } catch (err) {
    return res.status(500).json({ msgType: 'error', message: err.message });
  }
});

module.exports = router;
