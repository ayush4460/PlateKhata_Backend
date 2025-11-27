// backend/src/models/order.model.js
const db = require('../config/database');

class OrderModel {
  /**
   * Create order
   */
  static async create(orderData, client = db) {
    const {
      tableId,
      customerName,
      customerPhone,
      //customerEmail,
      subtotal,
      taxAmount,
      totalAmount,
      appliedTaxRate,
      specialInstructions,
      orderStatus = 'pending',
      paymentStatus = 'Pending',
      discountAmount = 0,
      orderType = 'regular',
    } = orderData;

    // This query now includes customer_email
    const query = `
      INSERT INTO orders (
          table_id, customer_name, customer_phone, customer_email,
          subtotal, tax_amount, discount_amount, total_amount, applied_tax_rate,
          special_instructions, order_status, payment_status, order_type
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) -- $13 parameters
      RETURNING *
    `;

    const result = await client.query(query, [
      tableId,
      customerName,
      customerPhone,
      null,
      subtotal,
      taxAmount,
      discountAmount,
      totalAmount,
      appliedTaxRate,
      specialInstructions,
      orderStatus,
      paymentStatus,
      orderType,
    ]);

    return result.rows[0];
  }

  /**
   * Create order items
   */
  static async createOrderItems(orderId, items, client = db) {
    const query = `
      INSERT INTO order_items (
          order_id, item_id, quantity, unit_price, total_price,
          item_name, item_category, special_instructions, status
        )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
      RETURNING *
    `;

    const orderItems = [];
    for (const item of items) {
      const itemTotalPrice = parseFloat(item.price) * item.quantity;
      const result = await client.query(query, [
        orderId,
        item.itemId,
        item.quantity,
        item.price,
        itemTotalPrice,
        item.itemName,
        item.itemCategory,
        item.specialInstructions,
      ]);
      orderItems.push(result.rows[0]);
    }
    return orderItems;
  }


  /**
   * Get all orders
   */
  static async findAll(filters = {}) {
    let query = `
      SELECT o.*, o.payment_method, t.table_number,
        json_agg(
          json_build_object(
            'order_item_id', oi.order_item_id,
            'item_id', oi.item_id,
            'item_name', oi.item_name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'special_instructions', oi.special_instructions,
            'item_category', oi.item_category
          )
        ORDER BY oi.order_item_id
      ) FILTER (WHERE oi.order_item_id IS NOT NULL) as items
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.table_id
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filters.tableId) {
      query += ` AND o.table_id = $${paramCount++}`;
      params.push(filters.tableId);
    }

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        query += ` AND o.order_status = ANY($${paramCount}::varchar[])`;
        params.push(filters.status);
        paramCount++;
      } else {
        query += ` AND o.order_status = $${paramCount}`;
        params.push(filters.status);
        paramCount++;
      }
    }

    if (filters.date) {
      query += ` AND DATE(o.created_at) = $${paramCount++}`;
      params.push(filters.date);
    }

    query += ' GROUP BY o.order_id, t.table_number ORDER BY o.created_at DESC';
    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get order by ID
   */
  static async findById(orderId) {
    const query = `
      SELECT o.*, o.payment_method, t.table_number,
        json_agg(
          json_build_object(
            'order_item_id', oi.order_item_id,
            'item_id', oi.item_id,
            'item_name', oi.item_name,
            'quantity', oi.quantity,
            'unit_price', oi.unit_price,
            'special_instructions', oi.special_instructions,
            'item_category', oi.item_category
          )
        ORDER BY oi.order_item_id
      ) FILTER (WHERE oi.order_item_id IS NOT NULL) as items
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.table_id
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      WHERE o.order_id = $1
      GROUP BY o.order_id, t.table_number
    `;
    const result = await db.query(query, [orderId]);
    return result.rows[0];
  }

  /**
   * Update *only* the order status
   */
  static async updateStatus(orderId, status) {
    const query = `
      UPDATE orders
      SET order_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE order_id = $2
      RETURNING *
    `;

    const result = await db.query(query, [status, orderId]);
    return result.rows[0];
  }

  /**
   * Update payment status and method
   */
  static async updatePaymentStatusWithMethod(orderId, paymentStatus, paymentMethod) {
    const query = `UPDATE orders SET payment_status = $1, payment_method = $2, updated_at = CURRENT_TIMESTAMP WHERE order_id = $3 RETURNING *`;
    const result = await db.query(query, [paymentStatus, paymentMethod, orderId]);
    return result.rows[0];
  }

  static async updatePaymentStatusOnly(orderId, paymentStatus) {
    const query = `
      UPDATE orders
      SET payment_status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE order_id = $2
      RETURNING *
    `;
    const result = await db.query(query, [paymentStatus, orderId]);
    return result.rows[0];
  }

  /**
   * Update *both* payment status and order status (e.g., on approval)
   */
  static async updatePaymentAndOrderState(orderId, paymentStatus, orderStatus) {
    const query = `
      UPDATE orders
      SET payment_status = $1, order_status = $2, updated_at = CURRENT_TIMESTAMP
      WHERE order_id = $3
      RETURNING *
    `;
    const result = await db.query(query, [paymentStatus, orderStatus, orderId]);
    return result.rows[0];
  }

  /**
   * Get kitchen orders
   */
  static async getKitchenOrders() {
     const query = `
      SELECT o.*, t.table_number,
        json_agg(
          json_build_object(
            'order_item_id', oi.order_item_id,
            'item_id', oi.item_id,
            'item_name', oi.item_name,
            'quantity', oi.quantity,
            'special_instructions', oi.special_instructions,
            'item_category', oi.item_category
          ) ORDER BY oi.order_item_id
        ) FILTER (WHERE oi.order_item_id IS NOT NULL) as items
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.table_id
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      WHERE o.order_status IN ('pending', 'confirmed', 'preparing', 'ready')
      GROUP BY o.order_id, t.table_number
      ORDER BY o.created_at ASC
    `;
    const result = await db.query(query);
    return result.rows;
  }

  /**
   * Cancel order
   */
  static async cancel(orderId) {
    const query = `
      UPDATE orders SET order_status = 'cancelled', updated_at = CURRENT_TIMESTAMP
      WHERE order_id = $1 AND order_status IN ('pending', 'confirmed')
       RETURNING *
    `;
    const result = await db.query(query, [orderId]);
    return result.rows[0];
  }
}

module.exports = OrderModel;