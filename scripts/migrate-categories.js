require('dotenv').config();
const db = require('../src/config/database');

async function migrateCategories() {
  const client = await db.pool.connect();
  try {
    console.log('Starting migration...');
    await client.query('BEGIN');

    // 1. Create categories table
    console.log('Creating categories table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        category_id SERIAL PRIMARY KEY,
        restaurant_id INTEGER REFERENCES restaurants(restaurant_id),
        name VARCHAR(100) NOT NULL,
        display_order INTEGER DEFAULT 0,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(restaurant_id, name)
      );
    `);

    // 2. Get distinct categories from menu_items
    console.log('Extracting existing categories...');
    const { rows: items } = await client.query('SELECT DISTINCT restaurant_id, category FROM menu_items WHERE category IS NOT NULL');

    // 3. Insert into categories table
    console.log(`Found ${items.length} unique category-restaurant pairs. Inserting...`);
    for (const item of items) {
      if (!item.category) continue;
      
      // Check if exists (idempotency)
      const { rows: existing } = await client.query(
        'SELECT category_id FROM categories WHERE restaurant_id = $1 AND name = $2',
        [item.restaurant_id, item.category]
      );

      if (existing.length === 0) {
        await client.query(
          'INSERT INTO categories (restaurant_id, name) VALUES ($1, $2)',
          [item.restaurant_id, item.category]
        );
      }
    }

    // 4. Add category_id to menu_items
    console.log('Adding category_id column to menu_items...');
    await client.query(`
      ALTER TABLE menu_items 
      ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(category_id);
    `);

    // 5. Update menu_items with category_id
    console.log('Linking menu_items to new categories...');
    await client.query(`
      UPDATE menu_items m
      SET category_id = c.category_id
      FROM categories c
      WHERE m.restaurant_id = c.restaurant_id AND m.category = c.name;
    `);

    // 6. Verify migration
    const { rows: pending } = await client.query('SELECT count(*) FROM menu_items WHERE category_id IS NULL AND category IS NOT NULL');
    if (parseInt(pending[0].count) > 0) {
      console.warn(`WARNING: ${pending[0].count} items could not be migrated!`);
    } else {
      console.log('All items successfully linked.');
    }

    await client.query('COMMIT');
    console.log('Migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    process.exit();
  }
}

migrateCategories();
