const db = require('../config/database');

class CategoryModel {
  static async create({ restaurantId, name, displayOrder }) {
    const query = `
      INSERT INTO categories (restaurant_id, name, display_order)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const result = await db.query(query, [restaurantId, name, displayOrder || 0]);
    return result.rows[0];
  }

  static async findAll(restaurantId) {
    const query = `
      SELECT * FROM categories 
      WHERE restaurant_id = $1 AND is_active = true
      ORDER BY display_order ASC, name ASC
    `;
    const result = await db.query(query, [restaurantId]);
    return result.rows;
  }

  static async findById(id) {
    const query = 'SELECT * FROM categories WHERE category_id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  static async update(id, updates) {
    const fields = [];
    const params = [id];
    let paramCount = 2;

    if (updates.name) {
      fields.push(`name = $${paramCount++}`);
      params.push(updates.name);
    }
    if (updates.displayOrder !== undefined) {
      fields.push(`display_order = $${paramCount++}`);
      params.push(updates.displayOrder);
    }
    if (updates.isActive !== undefined) {
      fields.push(`is_active = $${paramCount++}`);
      params.push(updates.isActive);
    }

    fields.push(`updated_at = CURRENT_TIMESTAMP`);

    if (fields.length === 0) return null;

    const query = `
      UPDATE categories 
      SET ${fields.join(', ')}
      WHERE category_id = $1
      RETURNING *
    `;
    const result = await db.query(query, params);
    return result.rows[0];
  }

  static async delete(id) {
    // Soft delete usually better, but for now hard delete or check dependencies?
    // User asked for "delete". Let's try hard delete first, but it might fail if items exist.
    // Better to check first.
    // Actually, implementation plan didn't specify. I'll stick to a simple delete for now, 
    // but the DB constraint might block it if items reference it.
    // Let's assume hard delete is okay if empty, otherwise we might need to handle the error.
    const query = 'DELETE FROM categories WHERE category_id = $1 RETURNING *';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }
}

module.exports = CategoryModel;
