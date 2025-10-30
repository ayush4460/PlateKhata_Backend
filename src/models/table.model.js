const db = require('../config/database');

class TableModel {
  /**
   * Create table
   */
  static async create(tableData) {
    const { tableNumber, capacity, qrCodeUrl } = tableData;

    const query = `
      INSERT INTO tables (table_number, capacity, qr_code_url)
      VALUES ($1, $2, $3)
      RETURNING *
    `;

    const result = await db.query(query, [tableNumber, capacity, qrCodeUrl]);
    return result.rows[0];
  }

  /**
   * Get all tables
   */
  static async findAll() {
    const query = 'SELECT * FROM tables ORDER BY table_number';
    const result = await db.query(query);
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
  static async findByNumber(tableNumber) {
    const query = 'SELECT * FROM tables WHERE table_number = $1';
    const result = await db.query(query, [tableNumber]);
    return result.rows[0];
  }

  /**
   * Update table
   */
  static async update(tableId, updates) {
    const fields = [];
    const params = [];
    let paramCount = 1;

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
    params.push(tableId);

    const query = `
      UPDATE tables
      SET ${fields.join(', ')}
      WHERE table_id = $${paramCount}
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
  static async getAvailableTables() {
    const query = 'SELECT * FROM tables WHERE is_available = true ORDER BY table_number';
    const result = await db.query(query);
    return result.rows;
  }
}

module.exports = TableModel;