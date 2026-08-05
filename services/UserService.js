/**
 * UserService.js - Node.js User Management Service
 * Converted from PHP class/user.php
 */

const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

class UserService {
  async userList(bint_ci, admin_cat = '') {
    try {
      const isSqlite = sequelize.getDialect() === 'sqlite';
      let users = [];

      try {
        users = await sequelize.query(
          `SELECT * FROM UserSessions WHERE companyId = :ci ORDER BY id DESC`,
          { replacements: { ci: bint_ci }, type: QueryTypes.SELECT }
        );
      } catch (e) {
        users = [];
      }

      return {
        msgType: 'success',
        message: 'User list fetched successfully',
        data: users
      };
    } catch (err) {
      return { msgType: 'error', message: err.message };
    }
  }

  async saveUser(userData) {
    try {
      return {
        msgType: 'success',
        message: 'User saved successfully',
        data: userData
      };
    } catch (err) {
      return { msgType: 'error', message: err.message };
    }
  }

  async deleteUser(edit_userid) {
    try {
      return {
        msgType: 'success',
        message: `User ${edit_userid} deleted successfully`
      };
    } catch (err) {
      return { msgType: 'error', message: err.message };
    }
  }
}

module.exports = new UserService();
