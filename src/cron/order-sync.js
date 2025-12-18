// backend/src/cron/order-sync.js
const OnlineOrderService = require('../services/online-order.service');

const SYNC_INTERVAL_MS = 30000; // 30 seconds

function startOrderSync() {
    console.log('[Cron] Starting Order Sync Job...');
    
    // Initial sync
    OnlineOrderService.syncOrders().catch(err => {
        console.error('[Cron] Initial sync failed:', err);
    });

    setInterval(() => {
        OnlineOrderService.syncOrders().catch(err => {
            console.error('[Cron] Periodic sync failed:', err);
        });
    }, SYNC_INTERVAL_MS);
}

module.exports = startOrderSync;
