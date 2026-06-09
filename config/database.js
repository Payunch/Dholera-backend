const { Sequelize } = require('sequelize');
const path = require('path');
const fs = require('fs');

const dialect = process.env.DB_DIALECT || 'sqlite';

let sequelize;
let databaseInfo = {
  mode: 'unknown',
  source: 'unknown',
  storagePath: null,
  persistent: false
};

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
  databaseInfo = {
    mode: 'postgresql',
    source: 'DATABASE_URL',
    storagePath: null,
    persistent: true
  };
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
  databaseInfo = {
    mode: 'mysql',
    source: 'DB_DIALECT=mysql',
    storagePath: null,
    persistent: true
  };

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
  databaseInfo = {
    mode: 'postgresql',
    source: 'DB_DIALECT=postgres',
    storagePath: null,
    persistent: true
  };
  console.log(`[DB] PostgreSQL → ${process.env.DB_HOST || '127.0.0.1'}:5432 / ${process.env.DB_NAME || 'dholera'}`);
} else {
  let storagePath = process.env.DATABASE_URL || path.join(__dirname, '../database.sqlite');

  const persistentCandidates = [
    process.env.RAILWAY_VOLUME_MOUNT_PATH ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'database.sqlite') : null,
    '/data/database.sqlite',
    '/app/data/database.sqlite',
    path.join(__dirname, '../data/database.sqlite')
  ].filter(Boolean);

  let validatedPath = null;
  
  for (const candidate of persistentCandidates) {
    const dir = path.dirname(candidate);
    try {
      // Check if directory exists and is writable
      if (fs.existsSync(dir)) {
        fs.accessSync(dir, fs.constants.W_OK);
        validatedPath = candidate;
        break;
      } else {
        // Try to create it if it's a local project path
        if (dir.includes('Dholera-backend') || dir.includes('data')) {
          fs.mkdirSync(dir, { recursive: true });
          fs.accessSync(dir, fs.constants.W_OK);
          validatedPath = candidate;
          break;
        }
      }
    } catch (err) {
      // Path not suitable, continue to next
    }
  }

  if (validatedPath) {
    storagePath = validatedPath;
  }

  const isPersistent = storagePath.startsWith('/data') || storagePath.includes('RAILWAY');
  
  if (isPersistent) {
    console.log(`[DB] Using persistent volume storage at ${storagePath}`);
  } else if (process.env.NODE_ENV === 'production') {
    console.warn(`[DB] ⚠️ Production is using local SQLite storage at ${storagePath}.`);
    console.warn('[DB] DATA WILL BE LOST ON REDEPLOY. Mount a Render Disk at /data to fix this.');
  }

  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: storagePath,
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    retry: {
      match: [
        /SQLITE_BUSY/
      ],
      name: 'query',
      max: 5
    }
  });

  // Enable WAL mode for better concurrency
  sequelize.query('PRAGMA journal_mode=WAL;');
  
  databaseInfo = {
    mode: 'sqlite',
    source: isPersistent ? 'persistent-volume' : 'local-fallback',
    storagePath,
    persistent: isPersistent
  };
  console.log(`[DB] SQLite → ${storagePath}`);
}

/**
 * Authenticate the connection and log a clear error if it fails.
 * Includes a retry mechanism for improved resilience during startup.
 */
async function testConnection(retries = 5, delay = 5000) {
  for (let i = 0; i < retries; i++) {
    try {
      await sequelize.authenticate();
      console.log('[DB] Connection established successfully.');
      return true;
    } catch (err) {
      console.warn(`[DB] ⚠️ Connection attempt ${i + 1}/${retries} failed: ${err.message}`);
      if (i < retries - 1) {
        console.log(`[DB] Retrying in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        console.error('[DB] ❌ Max retries reached. Unable to connect to the database:');
        console.error('   ', err.message);
        console.error('[DB] Check DATABASE_URL or DB_HOST, DB_USER, DB_PASS, DB_NAME in .env');
        return false;
      }
    }
  }
  return false;
}

module.exports = sequelize;
module.exports.testConnection = testConnection;
module.exports.getDatabaseInfo = () => databaseInfo;
