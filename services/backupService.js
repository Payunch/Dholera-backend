/**
 * Automated Backup Service
 * Schedules and performs database backups.
 * For SQLite: Copies the file.
 * For PostgreSQL: (Optional) Can be extended to run pg_dump.
 */

const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const { sequelize } = require('../models');

class BackupService {
  /**
   * Initializes the backup schedule.
   * Default: Every night at midnight.
   */
  static init() {
    const schedule = process.env.BACKUP_SCHEDULE || '0 0 * * *';
    
    cron.schedule(schedule, () => {
      console.log('⏰ Starting Automated Backup...');
      this.performBackup();
    });

    console.log(`📡 Backup Service Active: [${schedule}]`);
  }

  static async performBackup() {
    const dialect = sequelize.options.dialect;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '../backups');

    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    try {
      if (dialect === 'sqlite') {
        const source = sequelize.options.storage;
        const dest = path.join(backupDir, `database-backup-${timestamp}.sqlite`);
        
        fs.copyFileSync(source, dest);
        console.log(`✅ SQLite Backup Saved: ${dest}`);
        
        // Cleanup old backups (keep last 7)
        this.cleanup(backupDir, 7);
      } else {
        console.log(`ℹ️ PostgreSQL Backup: Ensure your OCI/RDS service has automated backups enabled.`);
        // Note: For a true pg_dump, you'd need the pg-client installed on the OS.
      }
    } catch (error) {
      console.error('❌ Backup Failed:', error.message);
    }
  }

  static cleanup(dir, keep) {
    const files = fs.readdirSync(dir)
      .filter(f => f.startsWith('database-backup'))
      .map(f => ({ name: f, time: fs.statSync(path.join(dir, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);

    if (files.length > keep) {
      files.slice(keep).forEach(f => {
        fs.unlinkSync(path.join(dir, f.name));
        console.log(`🗑️ Deleted old backup: ${f.name}`);
      });
    }
  }
}

module.exports = BackupService;
