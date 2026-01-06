require('../src/config/env'); // Load env first
const db = require('../src/config/database');
const OrderService = require('../src/services/order.service');
const TableModel = require('../src/models/table.model');
const SessionService = require('../src/services/session.service');

// Configuration
const RESTAURANT_ID = 3; // Based on user request data
const TABLE_ID = 40; // Based on user request data (Table 4)
const ITEM_ID = 29; // Cheese burger (from logs)

async function setup() {
    console.log('Setting up test...');
    // Clear active sessions for this table to start fresh
    await db.query(`UPDATE sessions SET is_active = false WHERE table_id = $1`, [TABLE_ID]);
    console.log('Sessions cleared for table', TABLE_ID);
}

async function runTest() {
    await setup();

    console.log('Starting concurrent requests...');
    const requests = [];
    const numRequests = 5;

    for (let i = 0; i < numRequests; i++) {
        const orderData = {
            tableId: TABLE_ID,
            restaurantId: RESTAURANT_ID,
            items: [
                {
                    itemId: ITEM_ID,
                    quantity: 1,
                    specialInstructions: `Test Request ${i}`
                }
            ],
            customerName: `Test User ${i}`,
            customerPhone: '1234567890',
            sessionToken: null // Simulate fresh entry
        };

        // We use a slight delay to ensure they are processed broadly in parallel but distinguishable
        // OR simply fire them all at once.
        requests.push(OrderService.createOrder(orderData));
    }

    try {
        const results = await Promise.allSettled(requests);
        console.log('Requests completed.');

        const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
        const failed = results.filter(r => r.status === 'rejected');

        console.log(`Successful: ${successful.length}, Failed: ${failed.length}`);
        
        if (failed.length > 0) {
            failed.forEach(f => console.error('Failure:', f.reason.message));
        }

        // Verification
        const sessionIds = new Set(successful.map(r => r.order.session_id));
        console.log('Unique Session IDs created:', sessionIds.size);
        console.log('Session IDs:', Array.from(sessionIds));

        if (sessionIds.size === 1) {
            console.log('SUCCESS: Only 1 session created for all concurrent requests!');
        } else {
            console.error('FAILURE: Multiple sessions created:', sessionIds.size);
        }

        // Verify items in orders
        const sessionID = successful[0].order.session_id;
        const allOrders = await db.query('SELECT * FROM orders WHERE session_id = $1', [sessionID]);
        console.log(`Total orders in session ${sessionID}: ${allOrders.rows.length}`);
        
        // Detailed check
        allOrders.rows.forEach(o => {
            console.log(`Order ${o.order_id}: Type=${o.order_type}, Status=${o.order_status}`);
        });

    } catch (err) {
        console.error('Test script error:', err);
    } finally {
        // process.exit(0); // Don't force exit, let pool close handle it? 
        // Actually we need to force exit or pool keeps running
        process.exit(0);
    }
}

// Run
runTest();
