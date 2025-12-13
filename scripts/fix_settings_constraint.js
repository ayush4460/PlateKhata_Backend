require('dotenv').config();
const db = require('../src/config/database');

async function runMigration() {
  try {
    console.log('Running migration: Add unique constraint to settings');
    await db.query('ALTER TABLE settings ADD CONSTRAINT settings_key_unique UNIQUE (setting_key);');
    console.log('Migration successful');
    process.exit(0);
  } catch (err) {
    if (err.code === '42710') {
      console.log('Constraint already exists, skipping.');
      process.exit(0);
    }
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
