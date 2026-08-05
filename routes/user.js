/**
 * routes/user.js - User Management Router (Converted from userdetail.php)
 */

const express = require('express');
const router = express.Router();
const UserService = require('../services/UserService');

router.post('/', async (req, res) => {
  try {
    const data = req.body || {};
    const { Op } = data;

    if (Op === 'UserList') {
      const result = await UserService.userList(data.bint_ci || 1, data.admin_cat);
      return res.json(result);
    } else if (Op === 'SaveUser') {
      const result = await UserService.saveUser(data);
      return res.json(result);
    } else if (Op === 'DeleteUser') {
      const result = await UserService.deleteUser(data.edit_userid);
      return res.json(result);
    }

    return res.json({
      msgType: 'success',
      message: 'Operation executed successfully'
    });
  } catch (err) {
    return res.status(500).json({ msgType: 'error', message: err.message });
  }
});

module.exports = router;
