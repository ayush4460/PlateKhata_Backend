require('dotenv').config();
const db = require('../src/config/database');

async function migrate() {
  const client = await db.pool.connect();
  try {
    console.log('Starting migration: Add Spice Levels...');

    await client.query('BEGIN');

    // 1. Add has_spice_levels to menu_items
    console.log('Adding has_spice_levels to menu_items...');
    await client.query(`
      ALTER TABLE menu_items 
      ADD COLUMN IF NOT EXISTS has_spice_levels BOOLEAN DEFAULT FALSE;
    `);

    // 2. Add spice_level to order_items
    console.log('Adding spice_level to order_items...');
    await client.query(`
      ALTER TABLE order_items 
      ADD COLUMN IF NOT EXISTS spice_level VARCHAR(50) DEFAULT NULL;
    `);

    await client.query('COMMIT');
    console.log('Migration completed successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    process.exit();
  }
}

migrate();
