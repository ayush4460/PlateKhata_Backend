const express = require('express');
const router = express.Router();
const DynoWebhookController = require('../controllers/dyno-webhook.controller');

// 1. Push New Orders
// POST /api/v1/dyno/orders
router.post('/orders', DynoWebhookController.handleIncomingOrders);

// 2. Poll Pending Actions (Reverse Polling)
// GET /api/v1/dyno/{restaurantId}/orders/status
router.get('/:restaurantId/orders/status', DynoWebhookController.getPendingActions);

// 3. Confirm Action Status
// POST /api/v1/dyno/orders/{orderId}/status
router.post('/orders/:orderId/status', DynoWebhookController.updateActionStatus);

// 4. Push History
// POST /api/v1/dyno/{restaurantId}/orders/history
router.post('/:restaurantId/orders/history', DynoWebhookController.handleHistory);

module.exports = router;
