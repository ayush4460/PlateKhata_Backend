require('dotenv').config();
const db = require('../src/config/database');

async function runMigration() {
  try {
    console.log('Running migration: Update payment_status check constraint');
    const client = await db.pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('ALTER TABLE orders DROP CONSTRAINT payment_status_valid;');
        await client.query(`
            ALTER TABLE orders ADD CONSTRAINT payment_status_valid CHECK (payment_status IN (
                'Pending', 'Approved', 'Failed', 'Refunded', 'Requested'
            ));
        `);
        await client.query('COMMIT');
        console.log('Migration successful');
    } catch (err) {
        await client.query('ROLLBACK');
        // Check if constraint doesn't exist (code 42704 for undefined object in Postgres, but verify)
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
