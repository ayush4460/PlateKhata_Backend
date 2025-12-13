require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../src/config/database');

async function apply() {
  try {
    const file = 'src/database/migrations/022_add_payment_method_to_orders.sql';
    console.log(`Applying migration: ${file}`);
    const sql = fs.readFileSync(file, 'utf8');
    
    await db.query(sql);
    console.log('Migration applied successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

apply();
