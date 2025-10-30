// backend/src/controllers/order.controller.js
const OrderService = require('../services/order.service');
const socketService = require('../services/socket.service');
const ApiResponse = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');
const { ROLES } = require('../config/constants');

class OrderController {
  /**
   * Create new order
   * POST /api/v1/orders
   */
  static createOrder = catchAsync(async (req, res) => {
    const order = await OrderService.createOrder(req.body);
    // This line now works
    socketService.emitNewOrder(order);
    return ApiResponse.created(res, order, 'Order placed successfully');
  });

  /**
   * Get all orders
   * GET /api/v1/orders
   */
  static getAllOrders = catchAsync(async (req, res) => {
    const { tableId, status, date } = req.query;
    const user = req.user; // From optionalAuth
    const filters = {};

    // Apply permissions logic
    if (user && (user.role === ROLES.ADMIN || user.role === ROLES.WAITER || user.role === ROLES.KITCHEN)) {
        console.log(`[Auth] getAllOrders called by Staff: ${user.role}`);
        if (tableId) filters.tableId = tableId;
    } else {
        if (!tableId) {
            console.log('[Auth] Public access to getAllOrders denied (no tableId provided)');
            return ApiResponse.success(res, []);
        }
        console.log(`[Auth] Public access to getAllOrders for table ${tableId}`);
        filters.tableId = tableId;
    }
    if (status) filters.status = status;
    if (date) filters.date = date;
    const orders = await OrderService.getAllOrders(filters);
    return ApiResponse.success(res, orders);
  });

  /**
   * Get order by ID
   * GET /api/v1/orders/:id
   */
  static getOrderById = catchAsync(async (req, res) => {
    const order = await OrderService.getOrderById(req.params.id);
    return ApiResponse.success(res, order);
  });

  /**
   * Update order status
   * PATCH /api/v1/orders/:id/status
   */
  static updateOrderStatus = catchAsync(async (req, res) => {
    const { status } = req.body;
    const order = await OrderService.updateOrderStatus(req.params.id, status);
    // This line now works
    socketService.emitOrderStatusUpdate(order.order_id, status, order.table_id);
    return ApiResponse.success(res, order, 'Order status updated successfully');
  });

  /**
   * Update payment status
   * PATCH /api/v1/orders/:id/payment
   */
  static updatePaymentStatus = catchAsync(async (req, res) => {
    const { paymentStatus } = req.body; // e.g., 'Approved'
    const order = await OrderService.updatePaymentStatus(req.params.id, paymentStatus);
    
    // This line now works
    socketService.emitOrderStatusUpdate(
      order.order_id,
      order.order_status, // Send the *current* order status
      order.table_id
    );

    return ApiResponse.success(res, order, 'Payment status updated successfully');
  });

  /**
   * Get kitchen orders
   * GET /api/v1/orders/kitchen/active
   */
  static getKitchenOrders = catchAsync(async (req, res) => {
    const orders = await OrderService.getKitchenOrders();
    return ApiResponse.success(res, orders);
  });

  /**
   * Cancel order
   * PATCH /api/v1/orders/:id/cancel
   */
  static cancelOrder = catchAsync(async (req, res) => {
    const order = await OrderService.cancelOrder(req.params.id);
    
    // This line now works
    if (order) { // Check if cancellation was successful
      socketService.emitOrderStatusUpdate(
        order.order_id,
        order.order_status, // Send the new 'cancelled' status
        order.table_id
      );
    }

    return ApiResponse.success(res, order, 'Order cancelled successfully');
  });

  /**
   * Get order statistics
   * GET /api/v1/orders/stats
   */
  static getOrderStats = catchAsync(async (req, res) => {
    const { date } = req.query;
    const filters = date ? { date } : {};
    const stats = await OrderService.getOrderStats(filters);
    return ApiResponse.success(res, stats);
  });
}

module.exports = OrderController;