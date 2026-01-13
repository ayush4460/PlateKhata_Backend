require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../src/config/database');

async function runMigration() {
  const file = process.argv[2];
  if (!file) {
    console.error('Please provide a migration file path (relative to project root)');
    process.exit(1);
  }

  const filePath = path.resolve(process.cwd(), file);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    process.exit(1);
  }

  console.log(`Running migration: ${file}`);
  const sql = fs.readFileSync(filePath, 'utf8');

  try {
    await db.query('BEGIN');
    await db.query(sql);
    await db.query('COMMIT');
    console.log('Migration completed successfully.');
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    // End the pool to allow script to exit
    // db.pool.end() handles this if exposed, otherwise manually if db module allows.
    // Looking at common pg usage, we might need to close the pool.
    // If db.query uses a singleton pool, we can try to call end on it if available.
    if (db.pool && typeof db.pool.end === 'function') {
        await db.pool.end();
    } else {
        process.exit(0);
    }
  }
}

runMigration();
