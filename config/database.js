const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

const dialect = process.env.DB_DIALECT || 'sqlite';

let sequelize;

if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres')) {
  // Production PostgreSQL (Railway/Render/etc)
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  });
  console.log('[DB] PostgreSQL → Connection via DATABASE_URL');
} else if (dialect === 'mysql') {
  const sslDisabled = process.env.DB_SSL === 'false' || process.env.DB_SSL === '0';

  sequelize = new Sequelize(
    process.env.DB_NAME || 'dholera',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || '',
    {
      host: process.env.DB_HOST || '127.0.0.1',
      dialect: 'mysql',
      logging: false,
      dialectOptions: {
        ssl: sslDisabled ? false : undefined,
        connectTimeout: 10000
      },
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );

  console.log(
    `[DB] MySQL → ${process.env.DB_HOST || '127.0.0.1'}:3306 / ${process.env.DB_NAME || 'dholera'} (SSL: ${!sslDisabled})`
  );
} else if (dialect === 'postgres') {
  sequelize = new Sequelize(
    process.env.DB_NAME || 'dholera',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASS || '',
    {
      host: process.env.DB_HOST || '127.0.0.1',
      dialect: 'postgres',
      logging: false,
      pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
      }
    }
  );
  console.log(`[DB] PostgreSQL → ${process.env.DB_HOST || '127.0.0.1'}:5432 / ${process.env.DB_NAME || 'dholera'}`);
} else {
  let storagePath = process.env.DATABASE_URL || path.join(__dirname, '../database.sqlite');
  
  if (fs.existsSync('/app/data')) {
    storagePath = '/app/data/database.sqlite';
    console.log(`[DB] Using persistent volume storage at ${storagePath}`);
  }

  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: storagePath,
    logging: false
  });
  console.log(`[DB] SQLite → ${storagePath}`);
}

/**
 * Authenticate the connection and log a clear error if it fails.
 * Called from index.js before .sync().
 */
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('[DB] Connection established successfully.');
    return true;
  } catch (err) {
    console.error('[DB] ❌ Unable to connect to the database:');
    console.error('   ', err.message);
    console.error('[DB] Check DATABASE_URL or DB_HOST, DB_USER, DB_PASS, DB_NAME in backend/.env');
    return false;
  }
}

module.exports = sequelize;
module.exports.testConnection = testConnection;
