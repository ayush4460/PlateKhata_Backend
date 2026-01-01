require('dotenv').config();
const db = require('./src/config/database');

async function check() {
  try {
    console.log('--- Checking orders table columns ---');
    const cols = await db.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders' AND column_name IN ('completed_at', 'created_at', 'updated_at');
    `);
    console.table(cols.rows);

    console.log('\n--- Checking set_completed_at function definition ---');
    const func = await db.query(`
      SELECT prosrc 
      FROM pg_proc 
      WHERE proname = 'set_completed_at';
    `);
    if (func.rows.length > 0) {
        console.log(func.rows[0].prosrc);
    } else {
        console.log('Function set_completed_at not found.');
    }

  } catch (err) {
    console.error(err);
  } finally {
    process.exit();
  }
}

check();
