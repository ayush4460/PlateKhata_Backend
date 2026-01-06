require('../src/config/env');
const db = require('../src/config/database');
const OrderService = require('../src/services/order.service');

const RESTAURANT_ID = 3;
const TABLE_ID = 8; // Using table from user logs (Table 8)
const ITEM_ID = 29;

async function runTest() {
    try {
        console.log('Clearing sessions...');
        await db.query('UPDATE sessions SET is_active = false WHERE table_id = $1', [TABLE_ID]);

        console.log('Creating Order 1...');
        const order1 = await OrderService.createOrder({
            tableId: TABLE_ID,
            restaurantId: RESTAURANT_ID,
            items: [{ itemId: ITEM_ID, quantity: 1 }],
            customerName: 'Seq User',
            sessionToken: null
        });
        const session1 = order1.order.session_id;
        console.log('Order 1 Created. Session:', session1);

        console.log('Waiting 3 seconds...');
        await new Promise(resolve => setTimeout(resolve, 3000));

        console.log('Creating Order 2 (with null session token)...');
        const order2 = await OrderService.createOrder({
            tableId: TABLE_ID,
            restaurantId: RESTAURANT_ID,
            items: [{ itemId: ITEM_ID, quantity: 1 }],
            customerName: 'Seq User',
            sessionToken: null // Force lookup
        });
        const session2 = order2.order.session_id;
        console.log('Order 2 Created. Session:', session2);

        if (session1 === session2) {
            console.log('SUCCESS: Sessions match.');
        } else {
            console.error('FAILURE: Sessions do not match!');
            console.error(`Session 1: ${session1}`);
            console.error(`Session 2: ${session2}`);
        }

    } catch (err) {
        console.error('Test error:', err);
    } finally {
        process.exit(0);
    }
}

runTest();
