require('dotenv').config();
const db = require('../src/config/database');

async function check() {
  const res = await db.query('SELECT * FROM restaurants');
  console.table(res.rows);
  process.exit(0);
}

check();
