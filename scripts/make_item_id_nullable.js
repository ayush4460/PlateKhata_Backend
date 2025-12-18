require('dotenv').config();
const db = require('../src/config/database');

async function runMigration() {
  try {
    console.log('Running migration: Make item_id nullable in order_items');
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('ALTER TABLE order_items ALTER COLUMN item_id DROP NOT NULL;');
        await client.query('COMMIT');
        console.log('Migration successful');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
        throw err;
    } finally {
        client.release();
    }
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

runMigration();
