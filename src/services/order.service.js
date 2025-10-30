// backend/src/services/order.service.js

const OrderModel = require('../models/order.model');
const MenuModel = require('../models/menu.model');
const TableModel = require('../models/table.model');
const db = require('../config/database');
const ApiError = require('../utils/apiError');
const EmailService = require('./email.service');
const SettingsService = require('./settings.service'); // Used to get the tax rate

class OrderService {
  /**
   * Create new order
   */
  static async createOrder(orderData) {
    const { tableId, items, customerName, customerPhone, customerEmail, specialInstructions } =
      orderData;

    // Verify table exists
    const table = await TableModel.findById(tableId);
    if (!table) { throw ApiError.notFound('Table not found'); }


    let currentTaxRate = 0.08; // Default fallback
    try {
        const taxRateSetting = await SettingsService.getSetting('tax_rate');
        if (taxRateSetting) {
          const parsedRate = parseFloat(taxRateSetting);
          if (!isNaN(parsedRate)) {
            currentTaxRate = parsedRate; // Use the rate from the database
          } else {
            console.error(`[OrderService] Invalid tax rate in settings: ${taxRateSetting}`);
          }
        } else {
           console.warn(`[OrderService] 'tax_rate' setting not found. Using default ${currentTaxRate}`);
        }
    } catch (err) {
        console.error("Failed to fetch tax rate setting, using default.", err);
    }


    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');


      let subtotal = 0;
      const orderItems = [];

      for (const item of items) {
        const menuItem = await MenuModel.findById(item.itemId);
        if (!menuItem) { throw ApiError.notFound(`Menu item ${item.itemId} not found`); }
        if (!menuItem.is_available) { throw ApiError.badRequest(`${menuItem.name} is not available`); }

        const price = parseFloat(menuItem.price);
        if (isNaN(price)) { throw ApiError.internalError(`Invalid price for item ${item.itemId}`); }
        
        const itemTotal = price * item.quantity;
        subtotal += itemTotal;

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
      const discountAmount = 0; // Default discount
      const finalTotalAmount = subtotal + taxAmount - discountAmount;


      // --- Pass All Amounts to Model ---
      const order = await OrderModel.create(
        {
          tableId,
          customerName,
          customerPhone,
          customerEmail, // Pass email to model
          subtotal: subtotal.toFixed(2),
          taxAmount: taxAmount.toFixed(2),
          discountAmount: discountAmount.toFixed(2),
          totalAmount: finalTotalAmount.toFixed(2),
          appliedTaxRate: currentTaxRate,
          specialInstructions,
          orderStatus: 'pending',
          paymentStatus: 'Pending',
        },
        client
      );


      await OrderModel.createOrderItems(order.order_id, orderItems, client);

      await client.query('COMMIT');

      // Fetch complete order with items to return to frontend
      const completeOrder = await OrderModel.findById(order.order_id);

      // Emit socket event *after* successful commit
      if (completeOrder) {
          // This call must be in the CONTROLLER, not the service
          // socketService.emitNewOrder(completeOrder);
      }
      
      return completeOrder;

    } catch (error) {
      await client.query('ROLLBACK');
      console.error("Error during order creation transaction:", error);
      if (error.code === '23514') {
          throw ApiError.internalError(`Database constraint violated (${error.constraint}).`);
      }
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get all orders
   */
  static async getAllOrders(filters) {
    return await OrderModel.findAll(filters);
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
   * Update *only* the payment status
   */
  static async updatePaymentStatus(orderId, paymentStatus) {
    const order = await OrderModel.findById(orderId);
    if (!order) {
      throw ApiError.notFound('Order not found');
    }
    
    // Logic: Only allow payment approval if order is 'ready' or 'served'
    if (paymentStatus === 'Approved' && !(order.order_status === 'ready' || order.order_status === 'served')) {
       throw ApiError.badRequest(`Cannot approve payment. Order status is '${order.order_status}', not 'ready' or 'served'.`);
    }
    if (order.order_status === 'cancelled') {
        throw ApiError.badRequest('Cannot approve payment for a cancelled order.');
    }
    
    let updatedOrder;
    if (paymentStatus === 'Approved') {
        // This function updates BOTH payment_status and order_status
        updatedOrder = await OrderModel.updatePaymentAndOrderState(orderId, paymentStatus, 'completed');
    } else {
        // For other payment statuses (like 'Failed'), just update payment
        updatedOrder = await OrderModel.updatePaymentStatusOnly(orderId, paymentStatus);
    }

    // --- SEND EMAIL ON APPROVAL ---
    if (updatedOrder.payment_status === 'Approved' && updatedOrder.customer_email) {
        // Fetch the full order details *with items* for the receipt
        const fullOrderForReceipt = await OrderModel.findById(orderId);
        if (fullOrderForReceipt) {
            // Don't wait for email to send, do it in background
            EmailService.sendReceipt(fullOrderForReceipt)
              .catch(err => console.error(`[EmailService] Failed to send receipt in background: ${err.message}`));
        } else {
            console.error(`[EmailService] Could not fetch full order ${orderId} for receipt.`);
        }
    }
    // --- END SEND EMAIL ---

    return updatedOrder; // Return the updated order from the DB
  }

  /**
   * Get kitchen orders
   */
  static async getKitchenOrders() {
    return await OrderModel.getKitchenOrders();
  }

  /**
   * Cancel order
   */
  static async cancelOrder(orderId) {
    const order = await OrderModel.cancel(orderId);
    if (!order) {
      throw ApiError.badRequest('Order not found or cannot be cancelled at this stage (must be pending/confirmed).');
    }
    // We moved the socket emit to the controller
    return order;
  }

  /**
   * Get order statistics
   */
  static async getOrderStats(filters = {}) {
    const orders = await OrderModel.findAll(filters);
    const stats = { totalOrders: 0, totalRevenue: 0, statusBreakdown: {}, averageOrderValue: 0, };
    if (!orders || orders.length === 0) return stats;
    stats.totalOrders = orders.length;
    stats.totalRevenue = orders.reduce((sum, order) => sum + parseFloat(order.total_amount), 0);
    orders.forEach((order) => { stats.statusBreakdown[order.order_status] = (stats.statusBreakdown[order.order_status] || 0) + 1; });
    if (orders.length > 0) { stats.averageOrderValue = stats.totalRevenue / stats.length; }
    return stats;
  }
}

module.exports = OrderService;