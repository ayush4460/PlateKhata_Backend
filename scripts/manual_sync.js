require('dotenv').config();
const OnlineOrderService = require('../src/services/online-order.service');
const db = require('../src/config/database');

async function runManualSync() {
    try {
        console.log('--- STARTING MANUAL SYNC ---');
        await db.pool.connect(); // Ensure DB pool is ready
        await OnlineOrderService.syncOrders();
        console.log('--- SYNC COMPLETED ---');
        await db.pool.end();
        process.exit(0);
    } catch (err) {
        console.error('SYNC FAILED:', err);
        process.exit(1);
    }
}

runManualSync();
