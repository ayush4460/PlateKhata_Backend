require('dotenv').config();
const db = require('../src/config/database');

async function migrateDietaryType() {
  const client = await db.pool.connect();
  try {
    console.log('Starting migration: Add dietary_type column...');

    // 1. Add column if not exists
    await client.query(`
      ALTER TABLE menu_items 
      ADD COLUMN IF NOT EXISTS dietary_type VARCHAR(20) DEFAULT 'non_veg';
    `);
    console.log('Column dietary_type added.');

    // 2. Migrate existing data
    console.log('Migrating existing data...');
    
    // Set 'veg' where is_vegetarian is true
    const vegResult = await client.query(`
        UPDATE menu_items 
        SET dietary_type = 'veg' 
        WHERE is_vegetarian = true;
    `);
    console.log(`Updated ${vegResult.rowCount} items to 'veg'.`);

    // Set 'non_veg' where is_vegetarian is false (default is non_veg but good to be explicit)
    const nonVegResult = await client.query(`
        UPDATE menu_items 
        SET dietary_type = 'non_veg' 
        WHERE is_vegetarian = false;
    `);
    console.log(`Updated ${nonVegResult.rowCount} items to 'non_veg'.`);

    console.log('Migration completed successfully.');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    client.release();
    process.exit();
  }
}

migrateDietaryType();
