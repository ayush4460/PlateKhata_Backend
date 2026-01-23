// backend/src/routes/order.routes.js
const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/order.controller');
const { authenticate, optionalAuth } = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const TableController = require('../controllers/table.controller');
const {
  createOrderValidator,
  updateOrderStatusValidator,
  updatePaymentStatusValidator,
} = require('../validators/order.validator');
const { ROLES } = require('../config/constants');

// Public routes
router.post('/', createOrderValidator, validate, OrderController.createOrder);

// Kitchen routes
router.get(
  '/kitchen/active',
  authenticate,
  authorize(ROLES.KITCHEN, ROLES.ADMIN),
  OrderController.getKitchenOrders
);


// Customers (no token) can access it, but the controller will limit them.
router.get(
  '/',
  optionalAuth,
  OrderController.getAllOrders
);


router.get(
  '/stats',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
  OrderController.getOrderStats
);

router.get(
  '/analytics/advanced',
  authenticate,
  authorize(ROLES.ADMIN),
  OrderController.getAdvancedAnalytics
);

router.get('/:id', optionalAuth, OrderController.getOrderById);

// Route for changing ORDER STATUS (e.g., pending -> preparing)
router.patch(
  '/:id/status',
  authenticate,
  authorize(ROLES.KITCHEN, ROLES.ADMIN, ROLES.WAITER, ROLES.SUPERVISOR),
  updateOrderStatusValidator,
  validate,
  OrderController.updateOrderStatus
);


// Route for changing PAYMENT STATUS (e.g., Pending -> Approved)
router.patch(
  '/:id/payment',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.WAITER, ROLES.KITCHEN, ROLES.SUPERVISOR),
  updatePaymentStatusValidator,
  validate,
  OrderController.updatePaymentStatus
);

// Route for Admin to override Session Total
router.patch(
  '/session/:sessionId/total',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.SUPERVISOR),
  validate, // strictly we should have a validator here but body.total is checked in controller
  OrderController.updateSessionTotal
);

// Payment request route for customers
router.patch(
  '/:id/payment-request',
  updatePaymentStatusValidator,
  validate,
  OrderController.requestPaymentUpdate
);

router.post(
  '/:id/clear',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.WAITER, ROLES.SUPERVISOR),
  TableController.clearTable
);

router.patch(
  '/:id/cancel',
  optionalAuth,
  OrderController.cancelOrder
);

module.exports = router;