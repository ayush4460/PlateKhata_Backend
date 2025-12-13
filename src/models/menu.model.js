const db = require('../config/database');

class MenuModel {
  /**
   * Create menu item
   */
  static async create(itemData) {
    const {
      name,
      description,
      category,
      price,
      imageUrl,
      isVegetarian,
      preparationTime,
      restaurantId,
    } = itemData;

    const query = `
      INSERT INTO menu_items (name, description, category, price, image_url, is_vegetarian, preparation_time, restaurant_id)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await db.query(query, [
      name,
      description,
      category,
      price,
      imageUrl,
      isVegetarian || false,
      preparationTime,
      restaurantId,
    ]);

    return result.rows[0];
  }

  /**
   * Get all menu items
   */
  static async findAll(filters = {}) {
    let query = 'SELECT * FROM menu_items WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (filters.restaurantId) {
        query += ` AND restaurant_id = $${paramCount}`;
        params.push(filters.restaurantId);
        paramCount++;
    }

    if (filters.category) {
      query += ` AND category = $${paramCount}`;
      params.push(filters.category);
      paramCount++;
    }

    if (filters.isAvailable !== undefined) {
      query += ` AND is_available = $${paramCount}`;
      params.push(filters.isAvailable);
      paramCount++;
    }

    if (filters.isVegetarian !== undefined) {
      query += ` AND is_vegetarian = $${paramCount}`;
      params.push(filters.isVegetarian);
      paramCount++;
    }

    query += ' ORDER BY category, name';

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Get menu item by ID
   */
  static async findById(itemId) {
    const id = Number.parseInt(itemId, 10);
    if (Number.isNaN(id)) {
      // throw or return null; choose return null so service can handle notFound
      return null;
    }
    const query = 'SELECT * FROM menu_items WHERE item_id = $1';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Update menu item
   */
  static async update(itemId, updates) {
    const fields = [];
    const params = [];
    let paramCount = 1;

    const allowedFields = [
      'name',
      'description',
      'category',
      'price',
      'imageUrl',
      'isAvailable',
      'isVegetarian',
      'preparationTime',
    ];

    const fieldMapping = {
      name: 'name',
      description: 'description',
      category: 'category',
      price: 'price',
      imageUrl: 'image_url',
      isAvailable: 'is_available',
      isVegetarian: 'is_vegetarian',
      preparationTime: 'preparation_time',
    };

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        fields.push(`${fieldMapping[key]} = $${paramCount}`);
        params.push(value);
        paramCount++;
      }
    }

    if (fields.length === 0) {
      throw new Error('No valid fields to update');
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    params.push(itemId);

    const query = `
      UPDATE menu_items
      SET ${fields.join(', ')}
      WHERE item_id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, params);
    return result.rows[0];
  }

  /**
   * Delete menu item
   */
  static async delete(itemId) {
    const id = Number.parseInt(itemId, 10);
    if (Number.isNaN(id)) {
      // Return null or throw; here we throw to fail fast
      throw new Error('Invalid itemId');
    }
    const query = 'DELETE FROM menu_items WHERE item_id = $1 RETURNING item_id';
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Get menu items by category
   */
   /**
   * Get menu items by category and restaurant
   */
  static async findByCategory(category, restaurantId) {
    const query = `
      SELECT * FROM menu_items
      WHERE category = $1 AND is_available = true AND restaurant_id = $2
      ORDER BY name
    `;
    const result = await db.query(query, [category, restaurantId]);
    return result.rows;
  }

  /**
   * Get all categories with item count
   */
   /**
   * Get all categories with item count for a restaurant
   */
  static async getCategories(restaurantId) {
    const query = `
      SELECT category, COUNT(*) as item_count
      FROM menu_items
      WHERE is_available = true AND restaurant_id = $1
      GROUP BY category
      ORDER BY category
    `;
    const result = await db.query(query, [restaurantId]);
    return result.rows;
  }
}

module.exports = MenuModel;