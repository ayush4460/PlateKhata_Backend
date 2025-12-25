require('dotenv').config();
const db = require('../config/database');

async function applyFix() {
  try {
    console.log('Applying fix: Dropping category_valid constraint...');
    const result = await db.query('ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS category_valid;');
    console.log('Fix applied successfully!', result);
    process.exit(0);
  } catch (error) {
    console.error('Fix failed:', error);
    process.exit(1);
  }
}

applyFix();
