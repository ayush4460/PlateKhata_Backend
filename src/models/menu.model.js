const db = require('../config/database');

class MenuModel {
  /**
   * Create menu item
   */
  static async create(itemData) {
    const {
      name,
      description,
      categoryId,
      price,
      imageUrl,
      isVegetarian,
      dietaryType, // New field
      preparationTime,
      restaurantId,
      hasSpiceLevels = false, // New field
    } = itemData;

    // Default dietaryType to 'veg' as per user requirement
    const finalDietaryType = dietaryType || (isVegetarian !== undefined ? (isVegetarian ? 'veg' : 'non_veg') : 'veg');
    // Keep is_vegetarian for backward compatibility (synced with type)
    const finalIsVegetarian = finalDietaryType === 'veg';

    // Fetch category name if not provided (Legacy support + DB Constraint)
    let categoryName = itemData.category;
    if (!categoryName && categoryId) {
      const catRes = await db.query('SELECT name FROM categories WHERE category_id = $1', [categoryId]);
      if (catRes.rows.length > 0) {
        categoryName = catRes.rows[0].name;
      }
    }
    // Fallback to satisfy NOT NULL constraint
    if (!categoryName) categoryName = 'Uncategorized';

    const query = `
      INSERT INTO menu_items (name, description, category_id, price, image_url, is_vegetarian, dietary_type, preparation_time, restaurant_id, has_spice_levels, category)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const result = await db.query(query, [
      name,
      description,
      categoryId,
      price,
      imageUrl,
      finalIsVegetarian,
      finalDietaryType,
      preparationTime,
      restaurantId,
      hasSpiceLevels,
      categoryName
    ]);

    return result.rows[0];
  }

  /**
   * Get all menu items
   */
  static async findAll(filters = {}) {
    // JOIN categories to get category_name for frontend compatibility
    let query = `
        SELECT m.*, c.name as category_name, c.display_order,
        (
            SELECT json_agg(json_build_object(
                'group_name', cg.name,
                'options', (
                    SELECT json_agg(json_build_object(
                        'name', co.name,
                        'priceModifier', COALESCE(ico.price_modifier, 0)
                    ) ORDER BY co.display_order)
                    FROM item_customization_options ico
                    JOIN customization_options co ON ico.option_id = co.option_id
                    WHERE ico.item_customization_id = ic.item_customization_id
                )
            ) ORDER BY ic.display_order)
            FROM item_customizations ic
            JOIN customization_groups cg ON ic.group_id = cg.group_id
            WHERE ic.item_id = m.item_id
        ) as customization_details
        FROM menu_items m
        LEFT JOIN categories c ON m.category_id = c.category_id
        WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filters.restaurantId) {
        query += ` AND m.restaurant_id = $${paramCount}`;
        params.push(filters.restaurantId);
        paramCount++;
    }

    // Support filtering by ID or Name (for backward compatibility if needed)
    if (filters.categoryId) {
      query += ` AND m.category_id = $${paramCount}`;
      params.push(filters.categoryId);
      paramCount++;
    }

    if (filters.isAvailable !== undefined) {
      query += ` AND m.is_available = $${paramCount}`;
      params.push(filters.isAvailable);
      paramCount++;
    }

    if (filters.isVegetarian !== undefined) {
      query += ` AND m.is_vegetarian = $${paramCount}`;
      params.push(filters.isVegetarian);
      paramCount++;
    }
    
    // Support filtering by dietary type
    if (filters.dietaryType) {
        query += ` AND m.dietary_type = $${paramCount}`;
        params.push(filters.dietaryType);
        paramCount++;
    }

    // Sort by Display Order (Category) -> Category Name -> Item Name
    query += ' ORDER BY c.display_order ASC, c.name ASC, m.name ASC';

    const result = await db.query(query, params);
    
    // Transform output to match expected frontend structure (category: string)
    // The frontend expects '.category' to be the name string in many places.
    return result.rows.map(row => ({
        ...row,
        category: row.category_name || row.category,
        customizationNames: row.customization_names || [], // Map to camelCase
        customizationDetails: row.customization_details || [] // Expose full details
    }));
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
    const query = `
      SELECT m.*, c.name as category_name,
      (
          SELECT json_agg(cg.name)
          FROM item_customizations ic
          JOIN customization_groups cg ON ic.group_id = cg.group_id
          WHERE ic.item_id = m.item_id
      ) as customization_names 
      FROM menu_items m
      LEFT JOIN categories c ON m.category_id = c.category_id
      WHERE m.item_id = $1
    `;
    const result = await db.query(query, [id]);
    
    if (result.rows.length === 0) return null;

    const row = result.rows[0];
    return {
        ...row,
        category: row.category_name || row.category,
        customizationNames: row.customization_names || []
    };
  }

  /**
   * Update menu item
   */
  static async update(itemId, updates) {
    const fields = [];
    const params = [];
    let paramCount = 1;

    // Handle dietary type sync logic if provided
    if (updates.dietaryType) {
        updates.isVegetarian = updates.dietaryType === 'veg';
    } else if (updates.isVegetarian !== undefined) {
        // If checking legacy toggle, update type
        updates.dietaryType = updates.isVegetarian ? 'veg' : 'non_veg';
    }

    const allowedFields = [
      'name',
      'description',
      'categoryId', 
      'price',
      'imageUrl',
      'isAvailable',
      'isVegetarian',
      'dietaryType', // Added
      'dietaryType', // Added
      'preparationTime',
      'hasSpiceLevels',
    ];

    const fieldMapping = {
      name: 'name',
      description: 'description',
      categoryId: 'category_id',
      price: 'price',
      imageUrl: 'image_url',
      isAvailable: 'is_available',
      isVegetarian: 'is_vegetarian',
      dietaryType: 'dietary_type', // Mapped
      dietaryType: 'dietary_type', // Mapped
      preparationTime: 'preparation_time',
      hasSpiceLevels: 'has_spice_levels',
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

    fields.push('updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT');
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