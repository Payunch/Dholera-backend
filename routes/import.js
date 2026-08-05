/**
 * routes/import.js - Data Import Router
 * Converted from importdetail.php
 */

const express = require('express');
const router = express.Router();
const ImportService = require('../services/ImportService');

router.post('/', async (req, res) => {
  try {
    const data = req.body || {};
    const { Op } = data;

    if (Op === 'ImportSalesData') {
      const result = await ImportService.importSalesData(
        data.bint_acyear,
        data.bint_acid,
        data.bint_ci,
        data.vac_username,
        data.sales_data
      );
      return res.json(result);
    } else if (Op === 'ImportBankData') {
      const result = await ImportService.importBankData(
        data.bint_acyear,
        data.bint_acid,
        data.bank_data
      );
      return res.json(result);
    }

    return res.json({
      msgType: 'success',
      message: 'Import processed successfully'
    });
  } catch (err) {
    return res.status(500).json({ msgType: 'error', message: err.message });
  }
});

module.exports = router;
