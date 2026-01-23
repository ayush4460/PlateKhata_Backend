// backend/src/controllers/order.controller.js
const OrderService = require('../services/order.service');
const socketService = require('../services/socket.service');
const ApiResponse = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');
const { ROLES } = require('../config/constants');
const TableModel = require('../models/table.model');
class OrderController {
  /**
   * Create new order
   * POST /api/v1/orders
   */
  static createOrder = catchAsync(async (req, res) => {

      const payload = {
        ...req.body,
        sessionToken: req.headers['x-session-token'] || req.body.sessionToken || null
      };

      let result;
      try {
        result = await OrderService.createOrder(payload);
      } catch (err) {
        console.error('[OrderController] createOrder -> service ERROR:', err && err.stack ? err.stack : err);
        return res.status(500).json({ success: false, message: 'Failed to create order' });
      }

      const returnedOrder = result && result.order ? result.order : null;
      const sessionToken = result && result.session_token ? result.session_token : null;

      // Emit new user order to kitchen
      if (returnedOrder) {
        socketService.emitNewOrder(returnedOrder);
      }

      const responsePayload = {
        order: returnedOrder,
        session_token: sessionToken
      };

      try {
        return ApiResponse.created(res, responsePayload, 'Order placed successfully');
      } catch (err) {
        console.error('[OrderController] ApiResponse.created failed:', err && err.stack ? err.stack : err);
        return res.status(201).json({ success: true, message: 'Order placed (fallback)', data: responsePayload });
      }
    });

  /**
   * Get all orders
   * GET /api/v1/orders
   */
  // Replace the getAllOrders method in order.controller.js

static getAllOrders = catchAsync(async (req, res) => {
  const { tableId, status, date, startDate, endDate } = req.query;
  const limit = req.query && req.query.limit ? parseInt(req.query.limit, 10) || 200 : 200;
  const user = req.user || null;
  const sessionToken = req.headers['x-session-token'];
  const filters = {};

  console.debug('[CTRL getAllOrders] user:', user ? { id: user.userId || user.id, role: user.role } : null);
  console.debug('[CTRL getAllOrders] query:', { tableId, status, date, limit });
  console.debug('[CTRL getAllOrders] x-session-token present:', !!sessionToken);

  // Staff: allow full access / table-level queries (admin / waiter / kitchen / supervisor)
  if (user && (user.role === ROLES.ADMIN || user.role === ROLES.WAITER || user.role === ROLES.KITCHEN || user.role === ROLES.SUPERVISOR || user.role === ROLES.SUPER_ADMIN)) {
    // Staff can query all tables or specific table
    if (tableId) filters.tableId = tableId;
    if (status) filters.status = Array.isArray(status) ? status : [status];
    if (date) filters.date = date;
    if (startDate) filters.startDate = startDate;
    if (endDate) filters.endDate = endDate;
    filters.limit = limit;
    filters.includeAllForStaff = true;
    filters.restaurantId = user.restaurantId;

    const orders = await OrderService.getAllOrders(filters);
    return ApiResponse.success(res, orders);
  }

  // PUBLIC/CUSTOMER ACCESS: Requires both tableId AND session token
  if (!tableId) {
    console.warn(`[CTRL getAllOrders] Public request missing tableId. Query: ${JSON.stringify(req.query)}`);
    return ApiResponse.success(res, []);
  }
  
  if (!sessionToken) {
    console.warn('[CTRL getAllOrders] Public request missing session token');
    return ApiResponse.success(res, []);
  }

  // CRITICAL: Filter by session token (this ensures only current session orders are shown)
  filters.tableId = tableId;
  filters.sessionToken = sessionToken;
  filters.limit = limit;

  // Handle status filtering
  if (status) {
    const statuses = Array.isArray(status) ? status : [status];
    // For customers, only allow querying active order statuses
    const allowedStatuses = ['pending', 'confirmed', 'preparing', 'ready', 'served'];
    const filtered = statuses.filter(s => 
      allowedStatuses.includes(String(s).toLowerCase())
    );
    
    if (filtered.length === 0) {
      console.warn('[CTRL getAllOrders] All requested statuses filtered out');
      return ApiResponse.success(res, []);
    }
    filters.status = filtered;
  } else {
    // DEFAULT: Only show active orders (exclude completed/cancelled)
    filters.status = ['pending', 'confirmed', 'preparing', 'ready', 'served'];
  }

  if (date) filters.date = date;

  const orders = await OrderService.getAllOrders(filters);
  
  console.debug('[CTRL getAllOrders] Returning', orders.length, 'orders for session');
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
    const { paymentStatus, paymentMethod } = req.body;
    const order = await OrderService.updatePaymentStatus(req.params.id, paymentStatus, paymentMethod);
    socketService.emitOrderStatusUpdate(
      order.order_id,
      order.order_status,
      order.table_id
    );

    return ApiResponse.success(res, order, 'Payment status updated successfully');
  });

  /**
   * Request payment update
   * PATCH /api/v1/orders/:id/payment-request
   */
  static requestPaymentUpdate = catchAsync(async (req, res) => {
    const { paymentStatus, paymentMethod } = req.body;
    if (paymentStatus !== 'Requested') {
      return ApiResponse.forbidden(res, 'Customers can only request payment verification.');
    }

    const order = await OrderService.updatePaymentStatus(req.params.id, paymentStatus, paymentMethod);
    socketService.emitOrderStatusUpdate(
      order.order_id,
      order.order_status,
      order.table_id
    );

    return ApiResponse.success(res, order, 'Payment verification requested');
  });

  /**
   * Get kitchen orders
   * GET /api/v1/orders/kitchen/active
   */
  static getKitchenOrders = catchAsync(async (req, res) => {
    const orders = await OrderService.getKitchenOrders(req.user.restaurantId);
    return ApiResponse.success(res, orders);
  });

  /**
   * Cancel order
   * PATCH /api/v1/orders/:id/cancel
   */
  static cancelOrder = catchAsync(async (req, res) => {
    const order = await OrderService.cancelOrder(req.params.id);
    if (order) {
      socketService.emitOrderStatusUpdate(
        order.order_id,
        order.order_status,
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
  /**
   * Update session total (Admin Override)
   * POST /api/v1/orders/session/:sessionId/total
   */
  static updateSessionTotal = catchAsync(async (req, res) => {
    const { sessionId } = req.params;
    const { total } = req.body;

    if (total === undefined || total === null) {
      return ApiResponse.badRequest(res, 'Total amount is required');
    }

    const result = await OrderService.updateSessionTotal(sessionId, parseFloat(total));
    
    // Emit update so active dashboards refresh
    // We can emit a general table update or specific change
    // Ideally we should emit to the room for that table/session
    // Since we don't have the tableId handy in the return unless we fetch it, 
    // we rely on the frontend reloading or the generic 'orders updated' event if available.
    // However, existing socketService.emitOrderStatusUpdate might not be enough.
    // For now, let's assuming refreshing the active sessions view is enough.
    
    // We can try to emit to "kitchen" or "admin" room if it exists.
    // Or just rely on the response.
    
    return ApiResponse.success(res, result, 'Session total updated successfully');
  });

  /**
   * Get advanced analytics data
   * GET /api/v1/orders/analytics/advanced
   */
  static getAdvancedAnalytics = catchAsync(async (req, res) => {
    const { startDate, endDate } = req.query;
    const restaurantId = req.user.restaurantId;

    const analytics = await OrderService.getAdvancedAnalytics({
      restaurantId,
      startDate: startDate ? parseInt(startDate) : undefined,
      endDate: endDate ? parseInt(endDate) : undefined
    });

    return ApiResponse.success(res, analytics);
  });
}

module.exports = OrderController;
