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
    customerEmail,
    subtotal,
    taxAmount,
    totalAmount,
    appliedTaxRate,
    specialInstructions,
    orderStatus = 'pending',
    paymentStatus = 'Pending',
    discountAmount = 0,
    orderType = 'regular',
    sessionId,
    restaurantId,
    
    // New fields for online orders
    externalOrderId = null,
    externalPlatform = null,
    dynoOrderId = null,
    rawStatus = null,
    externalOutletId = null
  } = orderData;

  const query = `
    INSERT INTO orders (
        table_id, customer_name, customer_phone, customer_email,
        subtotal, tax_amount, discount_amount, total_amount, applied_tax_rate,
        special_instructions, order_status, payment_status, order_type, order_number, session_id, restaurant_id,
        external_order_id, external_platform, dyno_order_id, raw_status, external_outlet_id
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
    RETURNING *
  `;

  const maxAttempts = 5;
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;

    // Generate a new order number for each attempt
    const order_number = await this.generateOrderNumber(client);
    console.log(`[OrderModel] Attempt ${attempts}/${maxAttempts} - Order number: ${order_number}`);

    try {
      const result = await client.query(query, [
        tableId, customerName, customerPhone, null,
        subtotal, taxAmount, discountAmount, totalAmount, appliedTaxRate,
        specialInstructions, orderStatus, paymentStatus, orderType, order_number, sessionId, restaurantId,
        externalOrderId, externalPlatform, dynoOrderId, rawStatus, externalOutletId
      ]);

      console.log(`[OrderModel] Order created successfully: ${result.rows[0].order_id}`);
      return result.rows[0];

    } catch (error) {
      // Check if it's a duplicate order number constraint violation
      if (error.code === '23505' && error.constraint?.includes('order_number')) {
        console.warn(`[OrderModel] Duplicate order number ${order_number}. Attempt ${attempts}/${maxAttempts}`);

        if (attempts >= maxAttempts) {
          throw new Error(`Failed to generate unique order number after ${maxAttempts} attempts.`);
        }

        // Add small delay to reduce collision probability
        await new Promise(resolve => setTimeout(resolve, 50 * attempts));

        continue;
      }

      // For any other error, throw immediately (don't retry)
      console.error('[OrderModel] Order creation failed with error:', error.code, error.message);
      throw error;
    }
  }

  throw new Error('Failed to create order after maximum retry attempts.');
}

  /**
   * Generate unique order number
   */
  /**
   * Generate unique order number
   */
  static async generateOrderNumber(client) {
    // Current Epoch
    const nowEpoch = Date.now();
    
    // Convert Epoch to IST Date string to extract YYYYMMDD
    // IST is UTC+5:30. 
    // We can use Intl.DateTimeFormat to get parts in 'Asia/Kolkata'
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    
    // formatter.format(new Date(nowEpoch)) -> "MM/DD/YYYY"
    const parts = formatter.formatToParts(new Date(nowEpoch));
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    
    const datePrefix = `${year}${month}${day}`;

    const query = `
      SELECT order_number
      FROM orders
      WHERE order_number LIKE $1
      ORDER BY order_number DESC
      LIMIT 1
    `;

    try {
      const result = await client.query(query, [`${datePrefix}%`]);

      let sequenceNum = 1;
      if (result.rows.length > 0) {
        const lastOrderNumber = result.rows[0].order_number;
        const lastSequence = parseInt(lastOrderNumber.slice(-4), 10);
        if (!isNaN(lastSequence)) {
          sequenceNum = lastSequence + 1;
        }
      }

      // Add safety check for sequence overflow
      if (sequenceNum > 9999) {
        console.warn('[OrderModel] Sequence exceeded 9999, using timestamp fallback');
        const timestamp = Date.now().toString().slice(-4);
        sequenceNum = parseInt(timestamp, 10);
      }

      const orderNumber = `${datePrefix}${String(sequenceNum).padStart(4, '0')}`;
      return orderNumber;

    } catch (error) {
      console.error('[OrderModel] Error generating order number:', error);
      const timestamp = Date.now().toString().slice(-6);
      return `${datePrefix}${timestamp.slice(-4)}`;
    }
  }

  /**
   * Create order items
   */
  static async createOrderItems(orderId, items, client = db) {
    const query = `
      INSERT INTO order_items (
          order_id, item_id, quantity, unit_price, total_price,
          item_name, item_category, special_instructions, status, spice_level
        )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9)
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
        item.spiceLevel || null,
      ]);
      const insertedItem = result.rows[0];

      if (item.customizations && item.customizations.length > 0) {
          for (const cust of item.customizations) {
              await client.query(
                  `INSERT INTO order_item_customizations (order_item_id, option_id, price, name) VALUES ($1, $2, $3, $4)`,
                  [insertedItem.order_item_id, cust.optionId, cust.price, cust.name]
              );
          }
      }

      orderItems.push(insertedItem);
    }
    return orderItems;
  }

  /**
   * Get all orders with filters
   */
  static async findAll(filters = {}) {
    //console.log('[DEBUG MODEL findAll] filters:', filters);

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
            'item_category', oi.item_category,
            'spice_level', oi.spice_level,
            'customizations', (SELECT COALESCE(json_agg(json_build_object('id', oic.option_id, 'name', oic.name, 'price', oic.price)), '[]'::json) FROM order_item_customizations oic WHERE oic.order_item_id = oi.order_item_id)

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

    // CRITICAL: Filter by session_id FIRST (most restrictive)
    if (filters.sessionId) {
      query += ` AND o.session_id = $${paramCount++}`;
      params.push(filters.sessionId);
      //console.log('[DEBUG MODEL findAll] Added sessionId filter:', filters.sessionId);
    }

    // Filter by table_id (secondary filter)
    if (filters.tableId) {
      query += ` AND o.table_id = $${paramCount++}`;
      params.push(filters.tableId);
      //console.log('[DEBUG MODEL findAll] Added tableId filter:', filters.tableId);
    }

    // Status handling: accepts array or single value
    if (filters.status) {
      if (Array.isArray(filters.status)) {
        const lowered = filters.status.map(s => String(s).toLowerCase());
        query += ` AND LOWER(o.order_status) = ANY($${paramCount}::varchar[])`;
        params.push(lowered);
        paramCount++;
        //console.log('[DEBUG MODEL findAll] Added status array filter:', lowered);
      } else {
        query += ` AND LOWER(o.order_status) = $${paramCount}`;
        params.push(String(filters.status).toLowerCase());
        paramCount++;
        //console.log('[DEBUG MODEL findAll] Added single status filter:', filters.status);
      }
    }

    // Date filter (Exact Match - IST "Day")
    if (filters.date) {
        // Input: "YYYY-MM-DD"
        // Need to convert this IST day to Start/End Epochs
        
        // Helper to get UTCOffset independent timestamp for start of day IST
        const getISTEpochRange = (dateStr) => {
             // Create date string in specific format for parsing "YYYY-MM-DDT00:00:00+05:30"
             const startISO = `${dateStr}T00:00:00.000+05:30`;
             const endISO = `${dateStr}T23:59:59.999+05:30`;
             return {
                 start: new Date(startISO).getTime(),
                 end: new Date(endISO).getTime()
             };
        };

        const { start, end } = getISTEpochRange(filters.date);
        
        query += ` AND o.created_at >= $${paramCount++} AND o.created_at <= $${paramCount++}`;
        params.push(start);
        params.push(end);
    }

    // Date Range Filter (Start Date)
    if (filters.startDate) {
        const startISO = `${filters.startDate}T00:00:00.000+05:30`;
        const startEpoch = new Date(startISO).getTime();
        query += ` AND o.created_at >= $${paramCount++}`;
        params.push(startEpoch);
    }

    // Date Range Filter (End Date)
    if (filters.endDate) {
        const endISO = `${filters.endDate}T23:59:59.999+05:30`;
        const endEpoch = new Date(endISO).getTime();
        query += ` AND o.created_at <= $${paramCount++}`;
        params.push(endEpoch);
    }

    // Restaurant filter
    if (filters.restaurantId) {
      query += ` AND o.restaurant_id = $${paramCount++}`;
      params.push(filters.restaurantId);
    }

    // Order Type filter
    if (filters.orderType) {
        query += ` AND o.order_type = $${paramCount++}`;
        params.push(filters.orderType);
    }

    query += ' GROUP BY o.order_id, t.table_number ORDER BY o.created_at DESC';

    // Limit
    const limit = filters.limit ? parseInt(filters.limit, 10) : 200;
    query += ` LIMIT $${paramCount++}`;
    params.push(limit);

    //console.log('[DEBUG MODEL findAll] Final query params:', params);

    const result = await db.query(query, params);
    //console.log('[DEBUG MODEL findAll] Result count:', result.rows.length);
    
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
            'item_category', oi.item_category,
            'spice_level', oi.spice_level,
            'customizations', (SELECT COALESCE(json_agg(json_build_object('id', oic.option_id, 'name', oic.name, 'price', oic.price)), '[]'::json) FROM order_item_customizations oic WHERE oic.order_item_id = oi.order_item_id)

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
    return result.rows[0] || null;
  }

  /**
   * Update order status only
   */
  static async updateStatus(orderId, status) {
    const query = `
      UPDATE orders
      SET order_status = $1, updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
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
    const query = `
      UPDATE orders 
      SET payment_status = $1, payment_method = $2, updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
      WHERE order_id = $3 
      RETURNING *
    `;
    const result = await db.query(query, [paymentStatus, paymentMethod, orderId]);
    return result.rows[0];
  }

  /**
   * Update payment status only
   */
  static async updatePaymentStatusOnly(orderId, paymentStatus) {
    const query = `
      UPDATE orders
      SET payment_status = $1, updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
      WHERE order_id = $2
      RETURNING *
    `;
    const result = await db.query(query, [paymentStatus, orderId]);
    return result.rows[0];
  }

  static async updateSessionPaymentStatusWithMethod(sessionId, paymentStatus, paymentMethod) {
    const query = `
      UPDATE orders
      SET payment_status = $1, payment_method = $2, updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
      WHERE session_id = $3 AND order_status NOT IN ('cancelled')
      RETURNING *
    `;
    const result = await db.query(query, [paymentStatus, paymentMethod, sessionId]);
    return result.rows;
  }

  static async updateSessionPaymentStatusOnly(sessionId, paymentStatus) {
    const query = `
      UPDATE orders
      SET payment_status = $1, updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
      WHERE session_id = $2 AND order_status NOT IN ('cancelled')
      RETURNING *
    `;
    const result = await db.query(query, [paymentStatus, sessionId]);
    return result.rows;
  }

  /**
   * Update both payment status and order status
   */
  static async updatePaymentAndOrderState(orderId, paymentStatus, orderStatus, paymentMethod) {
    const query = `
      UPDATE orders
      SET payment_status = $1, order_status = $2, payment_method = COALESCE($3, payment_method), updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
      WHERE order_id = $4
      RETURNING *
    `;
    const result = await db.query(query, [paymentStatus, orderStatus, paymentMethod, orderId]);
    return result.rows[0];
  }

  /**
   * Update payment status and order status for ENTIRE SESSION
   */
  static async updateSessionPaymentAndOrderState(sessionId, paymentStatus, orderStatus, paymentMethod) {
    const query = `
      UPDATE orders
      SET payment_status = $1, order_status = $2, payment_method = COALESCE($3, payment_method), updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
      WHERE session_id = $4 AND order_status NOT IN ('cancelled')
      RETURNING *
    `;
    const result = await db.query(query, [paymentStatus, orderStatus, paymentMethod, sessionId]);
    return result.rows; // Returns array of updated orders
  }

  /**
   * Get kitchen orders (active orders only)
   */
   /**
   * Get kitchen orders (active orders only)
   */
  static async getKitchenOrders(restaurantId) {
    const query = `
      SELECT o.*, t.table_number,
        json_agg(
          json_build_object(
            'order_item_id', oi.order_item_id,
            'item_id', oi.item_id,
            'item_name', oi.item_name,
            'quantity', oi.quantity,
            'special_instructions', oi.special_instructions,
            'item_category', oi.item_category,
            'spice_level', oi.spice_level,
            'customizations', (SELECT COALESCE(json_agg(json_build_object('id', oic.option_id, 'name', oic.name, 'price', oic.price)), '[]'::json) FROM order_item_customizations oic WHERE oic.order_item_id = oi.order_item_id)

          ) ORDER BY oi.order_item_id
        ) FILTER (WHERE oi.order_item_id IS NOT NULL) as items
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.table_id
      LEFT JOIN order_items oi ON o.order_id = oi.order_id
      WHERE o.order_status IN ('pending', 'confirmed', 'preparing', 'ready') AND o.restaurant_id = $1
      GROUP BY o.order_id, t.table_number
      ORDER BY o.created_at ASC
    `;
    const result = await db.query(query, [restaurantId]);
    return result.rows;
  }

  /**
   * Cancel order
   */
  static async cancel(orderId) {
    const query = `
      UPDATE orders
      SET order_status = 'cancelled', updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
      WHERE order_id = $1 AND order_status IN ('pending', 'confirmed')
      RETURNING *
    `;
    const result = await db.query(query, [orderId]);
    return result.rows[0];
  }

  /**
   * Get top selling items from order_items
   */
  static async getTopSellingItems(filters = {}) {
    let query = `
      SELECT oi.item_id, oi.item_name, SUM(oi.quantity) as total_quantity, SUM(oi.total_price) as total_revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.order_id
      WHERE o.order_status NOT IN ('cancelled')
    `;
    const params = [];
    let paramCount = 1;

    if (filters.restaurantId) {
      query += ` AND o.restaurant_id = $${paramCount++}`;
      params.push(filters.restaurantId);
    }

    if (filters.startDate) {
      query += ` AND o.created_at >= $${paramCount++}`;
      params.push(filters.startDate);
    }

    if (filters.endDate) {
      query += ` AND o.created_at <= $${paramCount++}`;
      params.push(filters.endDate);
    }

    query += ` GROUP BY oi.item_id, oi.item_name ORDER BY total_revenue DESC LIMIT $${paramCount++}`;
    params.push(filters.limit || 5);

    const result = await db.query(query, params);
    return result.rows;
  }
}

module.exports = OrderModel;