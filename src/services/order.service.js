// backend/src/services/order.service.js

const OrderModel = require('../models/order.model');
const MenuModel = require('../models/menu.model');
const TableModel = require('../models/table.model');
const db = require('../config/database');
const ApiError = require('../utils/apiError');
const SettingsService = require('./settings.service');
const SessionService = require('./session.service');

class OrderService {
  /**
   * Create new order
   */
  static async createOrder(orderData) {
    const { tableId, items, customerName, customerPhone, specialInstructions, sessionToken } = orderData;

    // Verify table exists
    const table = await TableModel.findById(tableId);
    if (!table) { throw ApiError.notFound('Table not found'); }

    if (table.is_available === false) {
      throw ApiError.badRequest('This table is disabled and cannot accept new orders.');
}

    // Validate or Create Session
    let session = null;
      if (sessionToken) {
        const s = await SessionService.validateSession(sessionToken);

        if (s) {
          const now = new Date();

          const notExpired = !s.expires_at || new Date(s.expires_at) > now;

          if (s.is_active && notExpired) {
            session = s;
          } else {
            console.log('[OrderService] Ignoring inactive/expired session for new order:', s.session_id);
          }
        }
      }

      if (!session) {
        session = await SessionService.getOrCreateSession(tableId);
      }


    let fName = customerName;
    let fPhone = customerPhone;
    if (customerName && customerPhone) {
      await SessionService.updateCustomerDetails(session.session_id, customerName, customerPhone);
    } else {
      fName = session.customer_name || 'Guest';
      fPhone = session.customer_phone || '';
    }

    // Determine if existing open order exists in session (addon vs regular)
    const existingOrders = await db.query(
      `SELECT * FROM orders
          WHERE session_id = $1
            AND payment_status IN ('Pending', 'Requested', 'Failed')
            AND order_status != 'cancelled'
          LIMIT 1`,
      [session.session_id]
    );
    const orderType = existingOrders.rows.length > 0 ? 'addon' : 'regular';

    // Default fallback for tax & discount
    let currentTaxRate = 0.00;
    let currentDiscountRate = 0.00;

    try {
      const taxSetting = await SettingsService.getSetting('tax_rate');
      if (taxSetting) currentTaxRate = parseFloat(taxSetting) || 0;

      const discountSetting = await SettingsService.getSetting('discount_rate');
      if (discountSetting) currentDiscountRate = parseFloat(discountSetting) || 0;
    } catch (err) { 
      console.error("[OrderService] Failed to fetch settings:", err);
    }

    let subtotal = 0;
    const orderItems = [];

    // Validate all items first (before transaction)
    for (const item of items) {
      const menuItem = await MenuModel.findById(item.itemId);
      if (!menuItem) {
        throw ApiError.notFound(`Menu item ${item.itemId} not found`);
      }
      if (!menuItem.is_available) {
        throw ApiError.badRequest(`${menuItem.name} is not available`);
      }

      const price = parseFloat(menuItem.price);
      if (isNaN(price)) {
        throw ApiError.internalError(`Invalid price for item ${item.itemId}`);
      }

      subtotal += price * item.quantity;
      orderItems.push({
        itemId: item.itemId,
        itemName: menuItem.name,
        itemCategory: menuItem.category,
        quantity: item.quantity,
        price: price,
        specialInstructions: item.specialInstructions || null,
      });
    }

    const taxAmount = subtotal * currentTaxRate;
    const discountAmount = subtotal * currentDiscountRate;
    const totalAmount = subtotal + taxAmount - discountAmount;

    // Start transaction
    const client = await db.pool.connect();
    let order = null;
    
    try {
      await client.query('BEGIN');
      console.log('[OrderService] Transaction started');

      // Create Order using transactional client
      order = await OrderModel.create({
        tableId,
        customerName: fName,
        customerPhone: fPhone,
        subtotal: subtotal.toFixed(2),
        taxAmount: taxAmount.toFixed(2),
        discountAmount: 0,
        totalAmount: totalAmount.toFixed(2),
        appliedTaxRate: currentTaxRate,
        specialInstructions,
        orderStatus: 'pending',
        paymentStatus: 'Pending',
        orderType: orderType || 'regular',
        sessionId: session.session_id
      }, client);

      console.log('[OrderService] Order created:', order.order_id);

      // Insert items using the same client
      await OrderModel.createOrderItems(order.order_id, orderItems, client);
      console.log('[OrderService] Order items created');

      await client.query('COMMIT');
      console.log('[OrderService] Transaction committed');

      // Fetch complete order with items
      const completeOrder = await OrderModel.findById(order.order_id);

      // Return predictable object
      return { order: completeOrder, session_token: session.session_token };
      
    } catch (error) {
      console.error('[OrderService] Transaction error:', error);
      
      // Rollback transaction
      try {
        await client.query('ROLLBACK');
        console.log('[OrderService] Transaction rolled back');
      } catch (rollbackError) {
        console.error('[OrderService] Rollback failed:', rollbackError);
      }
      
      throw error;
    } finally {
      client.release();
      console.log('[OrderService] Client released');
    }
  }

  /**
   * Resolve an active session id for a given table
   */
  static async resolveActiveSessionIdForTable(tableId) {
    try {
      const res = await db.query(
        `SELECT session_id FROM sessions
          WHERE table_id = $1 AND is_active = true
          ORDER BY created_at DESC
          LIMIT 1`,
        [tableId]
      );
      if (res.rows.length === 0) return null;
      return res.rows[0].session_id;
    } catch (err) {
      console.error('[OrderService] resolveActiveSessionIdForTable error:', err);
      return null;
    }
  }

  /**
   * Get all orders
   */
  static async getAllOrders(filters = {}) {
    const f = { ...filters };
    //console.log('[DEBUG SRV getAllOrders] incoming filters:', f);

    // STAFF/ADMIN: Full access to all orders
    if (f.includeAllForStaff) {
      delete f.includeAllForStaff;
      console.log('[DEBUG SRV getAllOrders] Staff query - all orders');
      return await OrderModel.findAll(f);
    }

    // CUSTOMER ACCESS: Session-based filtering
    if (f.sessionToken) {
      try {
        const session = await SessionService.validateSession(f.sessionToken);

        if (!session) {
          console.warn('[OrderService] Invalid session token');
          return [];
        }

        // Verify table match
        if (f.tableId && String(session.table_id) !== String(f.tableId)) {
          console.warn('[OrderService] Session does not match table');
          return [];
        }

        // Check if session is active
        const now = new Date();
        if (session.expires_at && new Date(session.expires_at) <= now) {
          console.warn('[OrderService] Session expired');
          return [];
        }

        // Query orders for this session
        f.sessionId = session.session_id;
        delete f.sessionToken;

        //  Show all orders EXCEPT cancelled

        f.status = ['pending', 'confirmed', 'preparing', 'ready', 'served', 'completed'];

        console.log('[DEBUG SRV getAllOrders] Customer query - session:', f.sessionId);
        return await OrderModel.findAll(f);

      } catch (err) {
        console.error('[OrderService] Error validating session:', err);
        return [];
      }
    }

    // Direct sessionId query (internal use)
    if (f.sessionId) {
      return await OrderModel.findAll(f);
    }

    // Table-only query (staff use)
    if (f.tableId) {
      return await OrderModel.findAll(f);
    }

    console.warn('[OrderService] No valid scope provided');
    return [];
  }

  /**
   * Get order by ID
   */
  static async getOrderById(orderId) {
    const order = await OrderModel.findById(orderId);
    if (!order) {
      throw ApiError.notFound('Order not found');
    }
    return order;
  }

  /**
   * Update order status
   */
  static async updateOrderStatus(orderId, status) {
    const order = await OrderModel.findById(orderId);
    if (!order) {
      throw ApiError.notFound('Order not found');
    }

    const validTransitions = {
      pending: ['confirmed', 'cancelled', 'preparing'],
      confirmed: ['preparing', 'cancelled'],
      preparing: ['ready'],
      ready: ['served'],
      served: ['completed'],
      completed: [],
      cancelled: [],
    };

    const currentStatus = order.order_status;
    if (validTransitions.hasOwnProperty(currentStatus)) {
      if (!validTransitions[currentStatus].includes(status)) {
        console.error(`[OrderService] Invalid transition from ${currentStatus} to ${status}`);
        throw ApiError.badRequest(
          `Cannot change status from ${currentStatus} to ${status}`
        );
      }
    } else {
      throw ApiError.badRequest(`Cannot change status from unknown state: ${currentStatus}`);
    }

    return await OrderModel.updateStatus(orderId, status);
  }

  /**
   * Update the payment status and method
   */
  static async updatePaymentStatus(orderId, paymentStatus, paymentMethod) {
    const order = await OrderModel.findById(orderId);
    if (!order) throw ApiError.notFound('Order not found');

    if (order.session_id && paymentStatus === 'Approved') {
      await OrderModel.updatePaymentAndOrderState(orderId, paymentStatus, 'completed');

      const client = await db.pool.connect();
      try {
        await client.query(
          `UPDATE orders SET payment_status = 'Approved', order_status = 'completed', updated_at = NOW()
            WHERE session_id = $1 AND order_id != $2`,
          [order.session_id, orderId]
        );
      } finally { client.release(); }

      // CRITICAL FIX: Set grace period instead of expiring session
      const remainingActiveRes = await db.query(
        `SELECT 1 FROM orders
          WHERE session_id = $1
            AND order_status NOT IN ('completed', 'cancelled')
            AND (payment_status IS NULL OR lower(payment_status) != 'approved')
          LIMIT 1`,
        [order.session_id]
      );

      if (remainingActiveRes.rows.length === 0) {
        try {
          // Set grace period for receipt download
          await SessionService.setGracePeriod(order.session_id, 10);
        } catch (err) {
          console.error(`[OrderService] Failed to set grace period: ${order.session_id}`, err);
        }
      }
      return await OrderModel.findById(orderId);
    }

    if (paymentStatus === 'Approved') {
      return await OrderModel.updatePaymentAndOrderState(orderId, paymentStatus, 'completed');
    } else if (paymentStatus === 'Requested') {
      return await OrderModel.updatePaymentStatusWithMethod(orderId, paymentStatus, paymentMethod);
    } else {
      return await OrderModel.updatePaymentStatusOnly(orderId, paymentStatus);
    }
  }

  /**
   * Get kitchen orders
   */
  static async getKitchenOrders() {
    return await OrderModel.getKitchenOrders();
  }

  /**
   * Cancel order - FIXED: Addon orders are deleted, not marked as cancelled
   */
  static async cancelOrder(orderId) {
    // First get the order to check its type
    const orderToCancel = await OrderModel.findById(orderId);
    if (!orderToCancel) {
      throw ApiError.notFound('Order not found');
    }

    // Check if order can be cancelled
    if (!['pending', 'confirmed'].includes(orderToCancel.order_status)) {
      throw ApiError.badRequest('Order cannot be cancelled at this stage (must be pending/confirmed).');
    }

    // Handle addon vs regular differently
    if (orderToCancel.order_type === 'addon') {

      //console.log(`[OrderService] Deleting addon order: ${orderId}`);

      try {
        const client = await db.pool.connect();
        try {
          await client.query('BEGIN');

          // Delete order items first (foreign key constraint)
          await client.query('DELETE FROM order_items WHERE order_id = $1', [orderId]);
          console.log(`[OrderService] Deleted order_items for addon order ${orderId}`);

          // Delete the order
          await client.query('DELETE FROM orders WHERE order_id = $1', [orderId]);
          console.log(`[OrderService] Deleted addon order ${orderId}`);
          
          await client.query('COMMIT');

          return orderToCancel;

        } catch (err) {
          await client.query('ROLLBACK');
          throw err;
        } finally {
          client.release();
        }
      } catch (err) {
        console.error(`[OrderService] Error deleting addon order ${orderId}:`, err);
        throw ApiError.internalError('Failed to delete addon order');
      }
      
    } else {
      // For REGULAR orders: Mark as cancelled (existing behavior)
      console.log(`[OrderService] Cancelling regular order: ${orderId}`);
      
      const order = await OrderModel.cancel(orderId);
      if (!order) {
        throw ApiError.badRequest('Order not found or cannot be cancelled at this stage.');
      }

      // Check if we should expire the session
      if (order.session_id) {
        try {
          // Check if there are any other non-cancelled, non-completed orders in this session
          const activeRes = await db.query(
            `SELECT 1 FROM orders
              WHERE session_id = $1
                AND order_status NOT IN ('completed', 'cancelled')
                AND (payment_status IS NULL OR lower(payment_status) != 'approved')
              LIMIT 1`,
            [order.session_id]
          );
          
          // Only expire session if no active orders remain
          if (activeRes.rows.length === 0) {
            await SessionService.expireSession(order.session_id);
            console.log(`[OrderService] Session expired after regular order cancellation: ${order.session_id}`);
          }
        } catch (err) {
          console.error(`[OrderService] Error checking/expiring session after cancel for session ${order.session_id}:`, err);
        }
      }
      
      return order;
    }
  }

  /**
   * Get order statistics
   */
  static async getOrderStats(filters = {}) {
    const orders = await OrderModel.findAll(filters);
    const stats = { totalOrders: 0, totalRevenue: 0, statusBreakdown: {}, averageOrderValue: 0 };
    if (!orders || orders.length === 0) return stats;
    stats.totalOrders = orders.length;
    stats.totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);
    orders.forEach((order) => { stats.statusBreakdown[order.order_status] = (stats.statusBreakdown[order.order_status] || 0) + 1; });
    if (orders.length > 0) { stats.averageOrderValue = stats.totalRevenue / stats.length; }
    return stats;
  }
}

module.exports = OrderService;