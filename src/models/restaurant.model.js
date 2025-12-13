const db = require('../config/database');

class RestaurantModel {
  /**
   * Create new restaurant
   */
  static async create(restaurantData) {
    const { name, address, contactEmail, isActive } = restaurantData;

    const query = `
      INSERT INTO restaurants (name, address, contact_email, is_active)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;

    const result = await db.query(query, [
      name,
      address,
      contactEmail,
      isActive !== undefined ? isActive : true,
    ]);

    return result.rows[0];
  }

  /**
   * Find restaurant by slug
   */
  static async findBySlug(slug) {
    const query = `
      SELECT *
      FROM restaurants
      WHERE slug = $1
    `;

    const result = await db.query(query, [slug]);
    return result.rows[0];
  }

  /**
   * Find restaurant by ID
   */
  static async findById(restaurantId) {
    const query = `
      SELECT *
      FROM restaurants
      WHERE restaurant_id = $1
    `;

    const result = await db.query(query, [restaurantId]);
    return result.rows[0];
  }

  /**
   * Get all restaurants
   */
  static async findAll(filters = {}) {
    let query = 'SELECT * FROM restaurants WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (filters.isActive !== undefined) {
      query += ` AND is_active = $${paramCount}`;
      params.push(filters.isActive);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.query(query, params);
    return result.rows;
  }
}

module.exports = RestaurantModel;
