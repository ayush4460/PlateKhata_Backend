require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../config/database');

const migrationsDir = path.join(__dirname, 'migrations');

async function runMigrations() {
  const client = await db.pool.connect();
  try {
    console.log('Starting database migrations...\n');
    
    // 1. Create migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        migration_name VARCHAR(255) PRIMARY KEY,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 2. Get list of executed migrations
    const { rows: executedRows } = await client.query('SELECT migration_name FROM schema_migrations');
    const executedMigrations = new Set(executedRows.map(row => row.migration_name));

    // 3. Get list of file migrations
    const files = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    let migrationCount = 0;

    for (const file of files) {
      if (executedMigrations.has(file)) {
        continue; // Skip already executed
      }

      console.log(`Running migration: ${file}`);
      const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (migration_name) VALUES ($1)', [file]);
        await client.query('COMMIT');
        console.log(`Completed: ${file}\n`);
        migrationCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Failed to run migration ${file}:`);
        throw err;
      }
    }

    if (migrationCount === 0) {
      console.log('No new migrations to run.');
    } else {
      console.log(`Successfully ran ${migrationCount} migrations.`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    client.release();
  }
}

runMigrations();