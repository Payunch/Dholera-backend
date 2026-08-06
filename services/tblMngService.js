/**
 * tblMngService.js - Node.js Table Management Service
 * Converted from PHP class/tblmng.php (Rite Mng Backend Concept)
 */

const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

class tblMngService {
  constructor() {
    this.response = [];
  }

  // Helper table name resolvers
  tblsupplier_acid(acid) {
    return `tblsupplier_${acid}`;
  }

  tblcustomer_acid(acid) {
    return `tblcustomer_${acid}`;
  }

  tblledgergroup_acid(acid) {
    return `tblledgergroup_${acid}`;
  }

  tblledger_acid(acid) {
    return `tblledger_${acid}`;
  }

  tblitem_acid(acid) {
    return `tblitem_${acid}`;
  }

  tblinvoicenosetting_acid(acid) {
    return `tblinvoicenosetting_${acid}`;
  }

  tbltransport_acid(acid) {
    return `tbltransport_${acid}`;
  }

  tbldetailmaster_acid(acid) {
    return `tbldetailmaster_${acid}`;
  }

  tblvehicleno_acid(acid) {
    return `tblvehicleno_${acid}`;
  }

  tblitemstockopening_acid(acid) {
    return `tblitemstockopening_${acid}`;
  }

  tbldefaultentrysetting_acid(acid) {
    return `tbldefaultentrysetting_${acid}`;
  }

  tblgeneralsettings_acid(acid) {
    return `tblgeneralsettings_${acid}`;
  }

  tblreferencemaster_acid(acid) {
    return `tblreferencemaster_${acid}`;
  }

  tbl_purchase_acid_yyyy(acid, year) {
    return `tblpurchase_${acid}_${year}`;
  }

  tbl_purchaseitem_acid_yyyy(acid, year) {
    return `tblpurchaseitem_${acid}_${year}`;
  }

  tbl_purchasedetails_acid_yyyy(acid, year) {
    return `tblpurchasedetails_${acid}_${year}`;
  }

  tbl_purchasepayment_acid_yyyy(acid, year) {
    return `tblpurchasepayment_${acid}_${year}`;
  }

  tbl_sales_acid_YYYY(acid, year) {
    return `tblsales_${acid}_${year}`;
  }

  tbl_salesitem_acid_YYYY(acid, year) {
    return `tblsalesitem_${acid}_${year}`;
  }

  tbl_salespayment_acid_yyyy(acid, year) {
    return `tblsalespayment_${acid}_${year}`;
  }

  tbl_income_acid_yyyy(acid, year) {
    return `tblincome_${acid}_${year}`;
  }

  tbl_expense_acid_yyyy(acid, year) {
    return `tblexpense_${acid}_${year}`;
  }

  tbl_order_acid_YYYY(acid, year) {
    return `tblorder_${acid}_${year}`;
  }

  tbl_jobin_acid_yyyy(acid, year) {
    return `tbljobin_${acid}_${year}`;
  }

  tbl_jobout_acid_yyyy(acid, year) {
    return `tbljobout_${acid}_${year}`;
  }

  tbl_ledgerbalance_acid_yyyy(acid, year) {
    return `tblledgerbalance_${acid}_${year}`;
  }

  tbl_vou_acid_yyyy(acid, year) {
    return `tblvou_${acid}_${year}`;
  }

  tbl_stockbalance_acid_yyyy(acid, year) {
    return `tblstockbalance_${acid}_${year}`;
  }

  /**
   * Check and add missing columns to database tables dynamically
   * Corresponds to PHP function chk_addcol_to_DB
   */
  async chk_addcol_to_DB(tablesToCheck = [], columnsToCheck = []) {
    const dbName = process.env.DB_NAME || 'dholera_db';
    for (const table of tablesToCheck) {
      for (const col of columnsToCheck) {
        try {
          const checkQuery = `
            SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_NAME = :table
            AND COLUMN_NAME = :colName
            AND TABLE_SCHEMA = :dbName
          `;
          const result = await sequelize.query(checkQuery, {
            replacements: { table, colName: col.col_name, dbName },
            type: QueryTypes.SELECT
          });

          const count = result[0] ? result[0].cnt : 0;
          if (count === 0) {
            const alterQuery = `ALTER TABLE \`${table}\` ADD COLUMN \`${col.col_name}\` ${col.col_datatype}`;
            await sequelize.query(alterQuery, { type: QueryTypes.RAW });

            if (col.col_default_value !== undefined) {
              const updateQuery = `UPDATE \`${table}\` SET \`${col.col_name}\` = :defaultVal`;
              await sequelize.query(updateQuery, {
                replacements: { defaultVal: col.col_default_value },
                type: QueryTypes.RAW
              });
            }
          }
        } catch (err) {
          this.response.push({ error: `Add Column Failed for ${col.col_name} in table ${table}: ${err.message}` });
        }
      }
    }
  }

  /**
   * Main table creation method per account and year
   * Corresponds to PHP function createTable_acid_yyyy
   */
  async createTable_acid_yyyy(bint_acid, bint_acyear) {
    const response = {
      msgType: 'success',
      message: `Table creation check completed for Account ${bint_acid}, Year ${bint_acyear}`,
      BolNavigateToDetailMaster: false,
      errors: []
    };

    try {
      // 1. Create Base Tables for Account
      const supplierTbl = this.tblsupplier_acid(bint_acid);
      const customerTbl = this.tblcustomer_acid(bint_acid);
      const ledgerGroupTbl = this.tblledgergroup_acid(bint_acid);
      const ledgerTbl = this.tblledger_acid(bint_acid);
      const itemTbl = this.tblitem_acid(bint_acid);

      const isSqlite = sequelize.getDialect() === 'sqlite';
      const engineSuffix = isSqlite ? '' : ' ENGINE = InnoDB DEFAULT CHARSET=utf8mb4';

      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS \`${supplierTbl}\` (
          bint_acid BIGINT,
          vac_company VARCHAR(100),
          vac_gstno VARCHAR(15),
          vac_supplier VARCHAR(100) PRIMARY KEY,
          vac_billingname VARCHAR(100),
          vac_personname VARCHAR(100),
          vac_address VARCHAR(1000),
          vac_city VARCHAR(100),
          vac_state VARCHAR(50),
          vac_statecode VARCHAR(5),
          vac_panno VARCHAR(10),
          vac_mobileno1 VARCHAR(10),
          vac_email1 VARCHAR(50),
          dec_openingamount DECIMAL(18, 2),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )${engineSuffix};
      `);

      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS \`${customerTbl}\` (
          bint_acid BIGINT,
          vac_company VARCHAR(100),
          vac_gstin VARCHAR(15),
          vac_customer VARCHAR(100) PRIMARY KEY,
          vac_billingname VARCHAR(100),
          vac_personname VARCHAR(100),
          vac_address VARCHAR(1000),
          vac_city VARCHAR(100),
          vac_state VARCHAR(50),
          vac_panno VARCHAR(10),
          vac_mobileno1 VARCHAR(10),
          vac_email1 VARCHAR(50),
          dec_openingamount DECIMAL(18, 2),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )${engineSuffix};
      `);

      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS \`${ledgerGroupTbl}\` (
          bint_acid BIGINT,
          vac_company VARCHAR(100),
          bint_ledgergroupidsrno INTEGER PRIMARY KEY ${isSqlite ? 'AUTOINCREMENT' : 'AUTO_INCREMENT'},
          vac_groupname VARCHAR(100),
          vac_groupheader VARCHAR(100),
          int_autocreated INT DEFAULT 0
        )${engineSuffix};
      `);

      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS \`${ledgerTbl}\` (
          bint_acid BIGINT,
          vac_company VARCHAR(100),
          bint_ledgeridsrno INTEGER PRIMARY KEY ${isSqlite ? 'AUTOINCREMENT' : 'AUTO_INCREMENT'},
          vac_gstno VARCHAR(15),
          vac_ledgername VARCHAR(100),
          bint_ledgercode BIGINT,
          vac_groupname VARCHAR(100),
          vac_groupheader VARCHAR(100),
          dec_opbalance DECIMAL(18, 2) DEFAULT 0.00,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )${engineSuffix};
      `);

      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS \`${itemTbl}\` (
          bint_acid BIGINT,
          vac_company VARCHAR(100),
          bint_itemidsrno INTEGER PRIMARY KEY ${isSqlite ? 'AUTOINCREMENT' : 'AUTO_INCREMENT'},
          vac_itemname VARCHAR(100),
          vac_hsncode VARCHAR(20),
          dec_rate DECIMAL(18, 2) DEFAULT 0.00,
          dec_gstpercent DECIMAL(5, 2) DEFAULT 0.00,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )${engineSuffix};
      `);

      // 2. Create Transactional Tables for Account + Year
      const salesTbl = this.tbl_sales_acid_YYYY(bint_acid, bint_acyear);
      const salesItemTbl = this.tbl_salesitem_acid_YYYY(bint_acid, bint_acyear);
      const purchaseTbl = this.tbl_purchase_acid_yyyy(bint_acid, bint_acyear);
      const purchaseItemTbl = this.tbl_purchaseitem_acid_yyyy(bint_acid, bint_acyear);

      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS \`${salesTbl}\` (
          bint_acid BIGINT,
          bint_acyear BIGINT,
          bint_salesid INTEGER PRIMARY KEY ${isSqlite ? 'AUTOINCREMENT' : 'AUTO_INCREMENT'},
          vac_invoiceno VARCHAR(50),
          dt_invoicedate DATE,
          vac_customer VARCHAR(100),
          dec_totalamount DECIMAL(18, 2) DEFAULT 0.00,
          dec_gstamount DECIMAL(18, 2) DEFAULT 0.00,
          dec_netamount DECIMAL(18, 2) DEFAULT 0.00,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )${engineSuffix};
      `);

      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS \`${salesItemTbl}\` (
          bint_acid BIGINT,
          bint_acyear BIGINT,
          bint_salesitemid INTEGER PRIMARY KEY ${isSqlite ? 'AUTOINCREMENT' : 'AUTO_INCREMENT'},
          bint_salesid BIGINT,
          vac_itemname VARCHAR(100),
          dec_qty DECIMAL(18, 3) DEFAULT 0.000,
          dec_rate DECIMAL(18, 2) DEFAULT 0.00,
          dec_amount DECIMAL(18, 2) DEFAULT 0.00
        )${engineSuffix};
      `);

      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS \`${purchaseTbl}\` (
          bint_acid BIGINT,
          bint_acyear BIGINT,
          bint_purchaseid INTEGER PRIMARY KEY ${isSqlite ? 'AUTOINCREMENT' : 'AUTO_INCREMENT'},
          vac_invoiceno VARCHAR(50),
          dt_invoicedate DATE,
          vac_supplier VARCHAR(100),
          dec_totalamount DECIMAL(18, 2) DEFAULT 0.00,
          dec_gstamount DECIMAL(18, 2) DEFAULT 0.00,
          dec_netamount DECIMAL(18, 2) DEFAULT 0.00,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )${engineSuffix};
      `);

      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS \`${purchaseItemTbl}\` (
          bint_acid BIGINT,
          bint_acyear BIGINT,
          bint_purchaseitemid INTEGER PRIMARY KEY ${isSqlite ? 'AUTOINCREMENT' : 'AUTO_INCREMENT'},
          bint_purchaseid BIGINT,
          vac_itemname VARCHAR(100),
          dec_qty DECIMAL(18, 3) DEFAULT 0.000,
          dec_rate DECIMAL(18, 2) DEFAULT 0.00,
          dec_amount DECIMAL(18, 2) DEFAULT 0.00
        )${engineSuffix};
      `);

    } catch (err) {
      console.error('[tblMngService] createTable_acid_yyyy Error:', err);
      response.msgType = 'error';
      response.message = `Table creation error: ${err.message}`;
      response.errors.push(err.message);
    }

    return response;
  }
}

module.exports = new tblMngService();
