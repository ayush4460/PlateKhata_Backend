require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../config/database');

const migrationsDir = path.join(__dirname, 'migrations');

async function runMigrations() {
  try {
    console.log('Starting database migrations...\n');

    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    for (const file of files) {
      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      await db.query(sql);
      console.log(`Completed: ${file}\n`);
    }

    console.log('All migrations completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  }
}

runMigrations();