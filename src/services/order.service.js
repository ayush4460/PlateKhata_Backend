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

    // 1. Initial Data Preparation & Validation (No DB Lock yet)
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

    // Validate all items first (Read Only - safe to do before lock)
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

      // Calculate Customizations Price & Validate
      let customizationTotal = 0;
      const validCustomizations = [];

      if (item.customizations && Array.isArray(item.customizations) && item.customizations.length > 0) {
           // Fetch valid configuration for this item
           // Optimization: we could cache or optimize this query but for now correctness first
           const itemCustConfig = await require('../models/customization.model').getItemCustomizations(item.itemId);
           
           for (const cust of item.customizations) {
               // item.customizations from frontend has { id, name, price, groupId }
               // We need to verify 'cust.id' (option_id) is valid for this item
               // Flatten options from groups
               let foundOption = null;
               
               // Iterate groups to find the option
               for (const group of itemCustConfig) {
                   const opt = group.options.find(o => String(o.option_id) === String(cust.id));
                   if (opt) {
                       foundOption = opt;
                       break;
                   }
               }

               if (!foundOption) {
                   console.warn(`[OrderService] Invalid customization option ${cust.id} for item ${item.itemId}. Ignoring.`);
                   continue;
               }

               const optPrice = parseFloat(foundOption.price_modifier || 0);
               customizationTotal += optPrice;
               
               validCustomizations.push({
                   optionId: foundOption.option_id,
                   price: optPrice,
                   name: foundOption.name
               });
           }
      }

      const effectiveUnitPrice = price + customizationTotal;
      subtotal += effectiveUnitPrice * item.quantity;

      orderItems.push({
        itemId: item.itemId,
        itemName: menuItem.name,
        itemCategory: menuItem.category,
        quantity: item.quantity,
        price: effectiveUnitPrice, // Store EFFECTIVE price (Base + Customizations)
        specialInstructions: item.specialInstructions || null,
        spiceLevel: item.spiceLevel || item.spice_level || null,
        customizations: validCustomizations // Pass to Model
      });
    }

    const taxAmount = subtotal * currentTaxRate;
    const discountAmount = subtotal * currentDiscountRate;
    const totalAmount = subtotal + taxAmount - discountAmount;

    // 2. Start Transaction
    const client = await db.pool.connect();
    
    try {
        await client.query('BEGIN');
        console.log('[OrderService] Transaction started');

        // 3. Acquire Table Lock
        // FOR UPDATE ensures no other transaction can process this table until we commit
        const tableRes = await client.query('SELECT * FROM tables WHERE table_id = $1 FOR UPDATE', [tableId]);
        
        if (tableRes.rows.length === 0) { 
            throw ApiError.notFound('Table not found'); 
        }
        const table = tableRes.rows[0];

        if (table.is_available === false) {
            throw ApiError.badRequest('This table is disabled and cannot accept new orders.');
        }

        // Verify Restaurant ID Match
        if (orderData.restaurantId && String(orderData.restaurantId) !== String(table.restaurant_id)) {
            throw ApiError.badRequest(`Table ${tableId} does not belong to restaurant ${orderData.restaurantId}`);
        }

        // 4. Validate or Create Session (WITH LOCK)
        let session = null;
        if (sessionToken) {
            const s = await SessionService.validateSession(sessionToken, client);

            if (s) {
                const now = Date.now();
                const notExpired = !s.expires_at || Number(s.expires_at) > now;

                if (String(s.table_id) !== String(tableId)) {
                    console.log(`[OrderService] Session table mismatch. SessionTable: ${s.table_id}, ReqTable: ${tableId}. Ignoring session.`);
                    session = null;
                } else if (s.is_active && notExpired) {
                    session = s;
                } else {
                    console.log('[OrderService] Ignoring inactive/expired session for new order:', s.session_id);
                }
            }
        }

        if (!session) {
            session = await SessionService.getOrCreateSession(tableId, client);
        }

        let fName = customerName;
        let fPhone = customerPhone;
        if (customerName && customerPhone) {
            await SessionService.updateCustomerDetails(session.session_id, customerName, customerPhone, client);
        } else {
            fName = session.customer_name || null;
            fPhone = session.customer_phone || null;
        }

        // 5. Determine order type (using client)
        const existingOrders = await client.query(
            `SELECT * FROM orders
            WHERE session_id = $1
                AND payment_status IN ('Pending', 'Requested', 'Failed')
                AND order_status != 'cancelled'
            LIMIT 1`,
            [session.session_id]
        );
        const orderType = existingOrders.rows.length > 0 ? 'addon' : 'regular';

        // 6. Create Order
        let order = await OrderModel.create({
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
            sessionId: session.session_id,
            restaurantId: table.restaurant_id
        }, client);

        console.log('[OrderService] Order created:', order.order_id);

        // 7. Insert items
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

        // Verify table match (Allow either ID or Table Number)
        if (f.tableId && String(session.table_id) !== String(f.tableId)) {
          // If ID doesn't match, check if it matches the table_number (e.g. "G1")
          const table = await TableModel.findById(session.table_id);
          if (!table || String(table.table_number) !== String(f.tableId)) {
             console.warn(`[OrderService] Session table mismatch. Session ID: ${session.table_id}, Request: ${f.tableId}`);
             return [];
          }
        }

        // Check if session is active
        const now = new Date();
        if (session.expires_at && new Date(session.expires_at) <= now) {
          console.warn('[OrderService] Session expired');
          return [];
        }

        // Query orders for this session
        f.sessionId = session.session_id;
        console.log(`[OrderService] Resolved session for token. ID: ${session.session_id}, TableID: ${session.table_id}`);
        
        delete f.sessionToken;
        // CRITICAL: Remove tableId filter because it might be a string (e.g. "G1") while DB expects INT
        // The sessionId is sufficient for isolation.
        delete f.tableId;

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
      // CHANGED: Use WithMethod to persist payment method (Cash/UPI)
      await OrderModel.updatePaymentStatusWithMethod(orderId, paymentStatus, paymentMethod);

      const client = await db.pool.connect();
      try {
        // CHANGED: Update all other orders in session to Approved AND set payment_method
        await client.query(
          `UPDATE orders SET payment_status = 'Approved', payment_method = $3, updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
            WHERE session_id = $1 AND order_id != $2`,
          [order.session_id, orderId, paymentMethod]
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
          // CHANGED: Do NOT set grace period (which deactivates session). Keep session active for Paid & Occupied status.
          // await SessionService.setGracePeriod(order.session_id, 10);
        } catch (err) {
          console.error(`[OrderService] Failed to set grace period: ${order.session_id}`, err);
        }
      }
    }



    const sessionId = order.session_id;

    if (sessionId) {
      // Update ALL orders in the session
      let updatedOrders;
      if (paymentStatus === 'Approved') {
        // CHANGED: Only update payment status, do NOT complete orders yet
        // ALSO: Pass paymentMethod
        updatedOrders = await OrderModel.updateSessionPaymentStatusWithMethod(sessionId, paymentStatus, paymentMethod);
      } else if (paymentStatus === 'Requested') {
        updatedOrders = await OrderModel.updateSessionPaymentStatusWithMethod(sessionId, paymentStatus, paymentMethod);
      } else {
        updatedOrders = await OrderModel.updateSessionPaymentStatusOnly(sessionId, paymentStatus);
      }
      // Return the specific order that was requested (updated version)
      return updatedOrders.find(o => String(o.order_id) === String(orderId)) || updatedOrders[0];
    } else {
        // Fallback for orders without session_id (legacy/edge case)
        if (paymentStatus === 'Approved') {
            // CHANGED: Do active update
             return await OrderModel.updatePaymentStatusOnly(orderId, paymentStatus);
        } else if (paymentStatus === 'Requested') {
            return await OrderModel.updatePaymentStatusWithMethod(orderId, paymentStatus, paymentMethod);
        } else {
            return await OrderModel.updatePaymentStatusOnly(orderId, paymentStatus);
        }
    }
  }

  /**
   * Get kitchen orders
   */
  static async getKitchenOrders(restaurantId) {
    return await OrderModel.getKitchenOrders(restaurantId);
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

    // Calculate Total Revenue
    stats.totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);

    // Calculate Unique Orders (Grouping by Session)
    const uniqueSessions = new Set();
    let nonSessionOrderCount = 0;

    orders.forEach((order) => {
      // Status Breakdown (count each sub-order or session? User didn't specify, but typically breakdown is by sub-order status)
      // If a session has one 'Served' and one 'Pending', how do we count? 
      // Current implementation counts sub-orders for breakdown, which is arguably correct for operational status.
      // But for "New Orders" count (Business Metric), we want Sessions.
      stats.statusBreakdown[order.order_status] = (stats.statusBreakdown[order.order_status] || 0) + 1;

      if (order.session_id) {
        uniqueSessions.add(order.session_id);
      } else {
        nonSessionOrderCount++;
      }
    });

    stats.totalOrders = uniqueSessions.size + nonSessionOrderCount;

    // Fix Average Order Value (Revenue / Unique Sessions)
    if (stats.totalOrders > 0) {
      stats.averageOrderValue = stats.totalRevenue / stats.totalOrders;
    }

    return stats;
  }

  /**
   * Update session total (Admin Override)
   */
  static async updateSessionTotal(sessionId, newTotal) {
    if (newTotal < 0) {
      throw ApiError.badRequest('Total cannot be negative');
    }

    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      const res = await client.query(`
        SELECT order_id, total_amount, discount_amount, tax_amount, subtotal
        FROM orders 
        WHERE session_id = $1 
          AND order_status NOT IN ('cancelled', 'completed')
        ORDER BY created_at DESC
      `, [sessionId]);

      if (res.rows.length === 0) {
        throw ApiError.notFound('No active orders found for this session');
      }

      const orders = res.rows;
      const currentSessionTotal = orders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
      const difference = currentSessionTotal - newTotal;
      
      console.log(`[OrderService] Override: Current=${currentSessionTotal}, New=${newTotal}, Diff=${difference}`);

      if (Math.abs(difference) < 0.01) {
        await client.query('ROLLBACK');
        return { sessionId, oldTotal: currentSessionTotal, newTotal: currentSessionTotal }; 
      }

      const latestOrder = orders[0];
      const oldDiscount = parseFloat(latestOrder.discount_amount || 0);
      let newDiscount = oldDiscount + difference;
      
      const oldTotal = parseFloat(latestOrder.total_amount);
      const newOrderTotal = oldTotal - difference;

      await client.query(`
        UPDATE orders 
        SET discount_amount = $1, total_amount = $2, updated_at = NOW()
        WHERE order_id = $3
      `, [newDiscount, newOrderTotal, latestOrder.order_id]);

      await client.query('COMMIT');
      
      return { 
        sessionId, 
        oldTotal: currentSessionTotal, 
        newTotal: newTotal 
      };

    } catch (err) {
      await client.query('ROLLBACK');
      console.error('[OrderService] updateSessionTotal failed:', err);
      throw err;
    } finally {
      client.release();
    }
  }
  /**
   * Get advanced analytics data
   */
  static async getAdvancedAnalytics(filters = {}) {
    const { restaurantId, startDate, endDate } = filters;

    // 1. Fetch Top Selling Items for the requested range
    const topSelling = await OrderModel.getTopSellingItems({
      restaurantId,
      startDate: startDate || undefined, // Fallback handled in Model if needed, but normally frontend passes 0/now
      endDate: endDate || undefined,
      limit: 5
    });

    return {
      topSelling: topSelling
    };
  }
}

module.exports = OrderService;