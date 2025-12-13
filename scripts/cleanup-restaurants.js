require('dotenv').config();
const db = require('../src/config/database');

async function clean() {
  console.log('Cleaning restaurants...');
  // Delete duplicates/tests. Keep 5 and 6.
  // We should also delete table/menu items for these if CASCADE is on.
  // Tables: ON DELETE CASCADE
  // Menu: ON DELETE CASCADE
  // Users: ON DELETE SET NULL
  
  await db.query('DELETE FROM restaurants WHERE restaurant_id IN (2, 3, 4)');
  console.log('Deleted restaurants 2, 3, 4.');
  process.exit(0);
}

clean();
