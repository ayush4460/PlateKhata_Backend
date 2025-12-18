// backend/src/routes/online-order.routes.js
const express = require('express');
const OnlineOrderController = require('../controllers/online-order.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/rbac.middleware');

const router = express.Router();

// All routes require authentication and restaurant admin/staff role
router.use(authenticate);
// router.use(authorize('admin', 'staff')); // Uncomment and ensure roles match your system

// Sync Orders Manually
router.post('/sync', OnlineOrderController.syncOrders);

// Get Online Orders
router.get('/', OnlineOrderController.getOnlineOrders);

// Config & History
router.get('/config', OnlineOrderController.getConfig);
router.get('/history/:outletId', OnlineOrderController.getOrderHistory);

// Order Actions
router.post('/:orderId/accept', OnlineOrderController.acceptOrder);
router.post('/:orderId/reject', OnlineOrderController.rejectOrder);
router.post('/:orderId/ready', OnlineOrderController.markReady);

module.exports = router;
