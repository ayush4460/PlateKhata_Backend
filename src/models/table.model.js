const db = require('../config/database');

class TableModel {
  /**
   * Create table
   */
  static async create(tableData) {
    const { tableNumber, capacity, qrCodeUrl, restaurantId } = tableData;

    const query = `
      INSERT INTO tables (table_number, capacity, qr_code_url, restaurant_id)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await db.query(query, [tableNumber, capacity, qrCodeUrl, restaurantId]);
    return result.rows[0];
  }

  /**
   * Get all tables
   */
   /**
   * Get all tables for a restaurant
   */
  static async findAll(restaurantId) {
    const query = 'SELECT * FROM tables WHERE restaurant_id = $1 ORDER BY table_number';
    const result = await db.query(query, [restaurantId]);
    return result.rows;
  }

  /**
   * Get table by ID
   */
  static async findById(tableId) {
    const query = 'SELECT * FROM tables WHERE table_id = $1';
    const result = await db.query(query, [tableId]);
    return result.rows[0];
  }

  /**
   * Get table by number
   */
   /**
   * Get table by number and restaurant
   */
  static async findByNumber(tableNumber, restaurantId) {
    const query = 'SELECT * FROM tables WHERE table_number = $1 AND restaurant_id = $2';
    const result = await db.query(query, [tableNumber, restaurantId]);
    return result.rows[0];
  }

  /**
   * Update table
   */
  static async update(tableId, updates) {
    const fields = [];
    const params = [tableId];
    let paramCount = 2;

    if (updates.tableNumber) {
      fields.push(`table_number = $${paramCount}`);
      params.push(updates.tableNumber);
      paramCount++;
    }

    if (updates.capacity) {
      fields.push(`capacity = $${paramCount}`);
      params.push(updates.capacity);
      paramCount++;
    }

    if (updates.qrCodeUrl) {
      fields.push(`qr_code_url = $${paramCount}`);
      params.push(updates.qrCodeUrl);
      paramCount++;
    }

    if (updates.isAvailable !== undefined) {
      fields.push(`is_available = $${paramCount}`);
      params.push(updates.isAvailable);
      paramCount++;
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    if (fields.length === 0) return null;

    const query = `
      UPDATE tables
      SET ${fields.join(', ')}
      WHERE table_id = $1
      RETURNING *
    `;

    const result = await db.query(query, params);
    return result.rows[0];
  }

  /**
   * Delete table
   */
  static async delete(tableId) {
    const query = 'DELETE FROM tables WHERE table_id = $1 RETURNING table_id';
    const result = await db.query(query, [tableId]);
    return result.rows[0];
  }

  /**
   * Get available tables
   */
   /**
   * Get available tables for a restaurant
   */
  static async getAvailableTables(restaurantId) {
    const query = 'SELECT * FROM tables WHERE is_available = true AND restaurant_id = $1 ORDER BY table_number';
    const result = await db.query(query, [restaurantId]);
    return result.rows;
  }
}

module.exports = TableModel;