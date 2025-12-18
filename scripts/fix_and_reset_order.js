require('dotenv').config();
const db = require('../src/config/database');

async function fixAndReset() {
  try {
    console.log('--- Starting Fix & Reset ---');
    const client = await db.pool.connect();
    
    try {
        await client.query('BEGIN');

        // 1. Update Restaurant Settings to include the missing Zomato ID
        // We append 19520792 if not present.
        const resSettings = await client.query('SELECT restaurant_id, zomato_restaurant_id FROM restaurants LIMIT 1');
        if (resSettings.rows.length > 0) {
            const r = resSettings.rows[0];
            let currentIds = (r.zomato_restaurant_id || '').split(',').map(s => s.trim()).filter(Boolean);
            
            // Add known IDs from logs
            const neededIds = ['20806853', '19520792', '20734881']; // From user logs and request
            
            neededIds.forEach(id => {
                if (!currentIds.includes(id)) currentIds.push(id);
            });

            const newIdString = currentIds.join(', ');
            
            await client.query('UPDATE restaurants SET zomato_restaurant_id = $1 WHERE restaurant_id = $2', [newIdString, r.restaurant_id]);
            console.log(`Updated Restaurant Config: ${newIdString}`);
        }

        // 2. Delete the specific incomplete order to force re-sync
        // External ID from user screenshot: 7590176804
        const delRes = await client.query("DELETE FROM orders WHERE external_order_id = '7590176804' RETURNING order_id");
        if (delRes.rowCount > 0) {
            console.log(`Deleted incomplete order #${delRes.rows[0].order_id} (External: 7590176804) to trigger re-sync.`);
        } else {
            console.log('Order 7590176804 not found (already deleted?).');
        }

        await client.query('COMMIT');
        console.log('--- SUCCESS: Ready for Re-Sync ---');

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Failed:', err);
        throw err;
    } finally {
        client.release();
    }
    process.exit(0);
  } catch (err) {
    console.error('Script Error:', err);
    process.exit(1);
  }
}

fixAndReset();
