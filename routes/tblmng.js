/**
 * routes/tblmng.js - Table Management Route (Converted from PHP tblmngdetail.php)
 */

const express = require('express');
const router = express.Router();
const tblMngService = require('../services/tblMngService');

router.post('/', async (req, res) => {
  try {
    const data = req.body || {};
    const { Op, bint_acid, bint_acyear } = data;

    if (Op === 'CreateTable_acid_year') {
      if (!bint_acid || !bint_acyear) {
        return res.status(400).json({
          msgType: 'error',
          message: 'Missing required parameters: bint_acid and bint_acyear'
        });
      }

      const result = await tblMngService.createTable_acid_yyyy(bint_acid, bint_acyear);
      return res.json(result);
    }

    return res.status(400).json({
      msgType: 'error',
      message: `Invalid operation: ${Op || 'undefined'}`
    });
  } catch (err) {
    console.error('[Route tblmng] Error:', err);
    return res.status(500).json({
      msgType: 'error',
      message: `Server Error: ${err.message}`
    });
  }
});

module.exports = router;
