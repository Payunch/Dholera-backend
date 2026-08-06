/**
 * routes/generalsettings.js - Settings Router
 * Converted from generalsettingsdetail.php, invoicesettingdetail.php, defaultentrysettingdetail.php
 */

const express = require('express');
const router = express.Router();
const settingsService = require('../services/settingsService');

router.post('/', async (req, res) => {
  try {
    const data = req.body || {};
    const { Op, bint_acid } = data;

    if (Op === 'GetGeneralSettings') {
      const result = await settingsService.getGeneralSettings(bint_acid || 1);
      return res.json(result);
    } else if (Op === 'SaveGeneralSettings') {
      const result = await settingsService.saveGeneralSettings(bint_acid || 1, data.setting);
      return res.json(result);
    } else if (Op === 'GetInvoiceSettings' || Op === 'GetBillSetting') {
      const result = await settingsService.getInvoiceSettings(bint_acid || 1);
      return res.json(result);
    } else if (Op === 'SaveInvoiceSettings' || Op === 'SaveBillSetting') {
      const result = await settingsService.saveInvoiceSettings(bint_acid || 1, data.setting);
      return res.json(result);
    } else if (Op === 'GetDefaultEntrySetting') {
      const result = await settingsService.getDefaultEntrySettings(bint_acid || 1);
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
