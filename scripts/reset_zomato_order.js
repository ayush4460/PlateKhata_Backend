require('dotenv').config();
const db = require('../src/config/database');

async function resetOrder() {
  try {
    const client = await db.pool.connect();
    
    try {
        await client.query('BEGIN');
        
        // Delete the order 
        // ID: 7593749165 (From latest screenshot)
        const delRes = await client.query("DELETE FROM orders WHERE external_order_id = '7593749165' RETURNING order_id");
        if (delRes.rowCount > 0) {
            console.log(`Deleted order #${delRes.rows[0].order_id} (External: 7593749165) for re-sync.`);
        } else {
            console.log('Order 7593749165 not found.');
        }

        await client.query('COMMIT');
        console.log('RESET COMPLETE.');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error(err);
    } finally {
        client.release();
        process.exit(0);
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

resetOrder();
