require('dotenv').config();
const db = require('../src/config/database');

async function fixCategoryConstraint() {
  const client = await db.pool.connect();
  try {
    console.log('Relaxing category column constraint...');
    await client.query('ALTER TABLE menu_items ALTER COLUMN category DROP NOT NULL');
    console.log('Successfully dropped NOT NULL constraint on category column.');
  } catch (error) {
    console.error('Failed to alter table:', error);
  } finally {
    client.release();
    process.exit();
  }
}

fixCategoryConstraint();
