// backend/src/routes/order.routes.js
const express = require('express');
const router = express.Router();
const OrderController = require('../controllers/order.controller');
const { authenticate, optionalAuth } = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  createOrderValidator,
  updateOrderStatusValidator,
  // --- IMPORT NEW VALIDATOR ---
  updatePaymentStatusValidator,
} = require('../validators/order.validator');
const { ROLES } = require('../config/constants');

// Public/Customer routes
router.post('/', createOrderValidator, validate, OrderController.createOrder);

// Kitchen routes
router.get(
  '/kitchen/active',
  authenticate,
  authorize(ROLES.KITCHEN, ROLES.ADMIN),
  OrderController.getKitchenOrders
);

// --- MODIFIED ROUTE ---
// This route now uses optionalAuth.
// Customers (no token) can access it, but the controller will limit them.
router.get(
  '/',
  optionalAuth, // <-- CHANGED from 'authenticate'
  // 'authorize' middleware removed, logic is moved to controller
  OrderController.getAllOrders
);
// --- END MODIFICATION ---

router.get(
  '/stats',
  authenticate,
  authorize(ROLES.ADMIN),
  OrderController.getOrderStats
);

router.get('/:id', optionalAuth, OrderController.getOrderById);

// Route for changing ORDER STATUS (e.g., pending -> preparing)
router.patch(
  '/:id/status',
  authenticate,
  authorize(ROLES.KITCHEN, ROLES.ADMIN, ROLES.WAITER),
  updateOrderStatusValidator,
  validate,
  OrderController.updateOrderStatus
);

// --- ADD NEW ROUTE FOR PAYMENT ---
// Route for changing PAYMENT STATUS (e.g., Pending -> Approved)
router.patch(
  '/:id/payment',
  authenticate, // Only authenticated staff can approve payment
  authorize(ROLES.ADMIN, ROLES.WAITER), // Or whichever roles can take payment
  updatePaymentStatusValidator, // Use the new validator
  validate,
  OrderController.updatePaymentStatus // Use the new controller function
);
// --- END NEW ROUTE ---

router.patch(
  '/:id/cancel',
  optionalAuth,
  OrderController.cancelOrder
);

module.exports = router;