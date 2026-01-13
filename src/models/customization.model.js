const db = require('../config/database');

class CustomizationModel {
  /**
   * Create a new customization group
   */
  static async createGroup(data) {
    const { restaurantId, name, minSelection, maxSelection, isRequired } = data;
    
    const query = `
      INSERT INTO customization_groups (restaurant_id, name, min_selection, max_selection, is_required)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const result = await db.query(query, [restaurantId, name, minSelection, maxSelection, isRequired]);
    return result.rows[0];
  }

  /**
   * Add an option to a group
   */
  static async addOption(data) {
    const { groupId, name, isAvailable, displayOrder } = data;
    
    // Default display order to max + 1
    let order = displayOrder;
    if (order === undefined) {
        const countRes = await db.query('SELECT COUNT(*) FROM customization_options WHERE group_id = $1', [groupId]);
        order = parseInt(countRes.rows[0].count) + 1;
    }

    const query = `
      INSERT INTO customization_options (group_id, name, is_available, display_order)
      VALUES ($1, $2, $3, $4)
      RETURNING *
    `;
    
    const result = await db.query(query, [groupId, name, isAvailable !== false, order]);
    return result.rows[0];
  }

  /**
   * Get all groups for a restaurant with their options
   */
  static async getGroupsByRestaurant(restaurantId) {
    // Fetch groups
    const groupsQuery = `
      SELECT * FROM customization_groups 
      WHERE restaurant_id = $1 AND is_active = true
      ORDER BY created_at DESC
    `;
    const groupsRes = await db.query(groupsQuery, [restaurantId]);
    const groups = groupsRes.rows;

    if (groups.length === 0) return [];

    // Fetch options for these groups
    const groupIds = groups.map(g => g.group_id);
    const optionsQuery = `
      SELECT * FROM customization_options 
      WHERE group_id = ANY($1::int[])
      ORDER BY display_order ASC
    `;
    const optionsRes = await db.query(optionsQuery, [groupIds]);
    const options = optionsRes.rows;

    // Attach options to groups
    const groupsWithOptions = groups.map(group => ({
      ...group,
      options: options.filter(opt => opt.group_id === group.group_id)
    }));

    return groupsWithOptions;
  }

  /**
   * Update a customization group
   */
  static async updateGroup(groupId, updates) {
    const fields = [];
    const params = [];
    let paramCount = 1;

    const allowedFields = ['name', 'minSelection', 'maxSelection', 'isRequired', 'isActive'];
    const fieldMapping = {
      name: 'name',
      minSelection: 'min_selection',
      maxSelection: 'max_selection',
      isRequired: 'is_required',
      isActive: 'is_active'
    };

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key) && value !== undefined) {
        fields.push(`${fieldMapping[key]} = $${paramCount}`);
        params.push(value);
        paramCount++;
      }
    }

    if (fields.length === 0) return null;

    fields.push('updated_at = NOW()');
    params.push(groupId);

    const query = `
      UPDATE customization_groups
      SET ${fields.join(', ')}
      WHERE group_id = $${paramCount}
      RETURNING *
    `;

    const result = await db.query(query, params);
    return result.rows[0];
  }

  /**
   * Update an option
   */
  static async updateOption(optionId, updates) {
    const fields = [];
    const params = [];
    let paramCount = 1;

    const allowedFields = ['name', 'isAvailable', 'displayOrder'];
    const fieldMapping = {
        name: 'name',
        isAvailable: 'is_available',
        displayOrder: 'display_order'
    };

    for (const [key, value] of Object.entries(updates)) {
        if (allowedFields.includes(key) && value !== undefined) {
            fields.push(`${fieldMapping[key]} = $${paramCount}`);
            params.push(value);
            paramCount++;
        }
    }

    if (fields.length === 0) return null;
    
    fields.push('updated_at = NOW()');
    params.push(optionId);

    const query = `UPDATE customization_options SET ${fields.join(', ')} WHERE option_id = $${paramCount} RETURNING *`;
    const result = await db.query(query, params);
    return result.rows[0];
  }

  /**
   * Delete a group (Hard delete or soft delete depending on logic, hard delete for now as per schema cascade)
   */
  static async deleteGroup(groupId) {
    const query = 'DELETE FROM customization_groups WHERE group_id = $1 RETURNING group_id';
    const result = await db.query(query, [groupId]);
    return result.rows[0];
  }

  /**
   * Delete an option
   */
  static async deleteOption(optionId) {
    const query = 'DELETE FROM customization_options WHERE option_id = $1 RETURNING option_id';
    const result = await db.query(query, [optionId]);
    return result.rows[0];
  }

  /**
   * Assign a customization group to an item with option overrides
   */
  static async assignToItem(itemId, groupId, optionsOverrides = []) {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Create/Update item_customizations link
      const linkQuery = `
        INSERT INTO item_customizations (item_id, group_id)
        VALUES ($1, $2)
        ON CONFLICT (item_id, group_id) DO UPDATE SET updated_at = NOW()
        RETURNING item_customization_id
      `;
      const linkRes = await client.query(linkQuery, [itemId, groupId]);
      const itemCustomizationId = linkRes.rows[0].item_customization_id;

      // 2. Clear existing overrides for this link (simple replace strategy)
      await client.query('DELETE FROM item_customization_options WHERE item_customization_id = $1', [itemCustomizationId]);

      // 3. Insert new overrides
      if (optionsOverrides.length > 0) {
        for (const opt of optionsOverrides) {
          await client.query(`
            INSERT INTO item_customization_options (item_customization_id, option_id, price_modifier, is_default)
            VALUES ($1, $2, $3, $4)
          `, [itemCustomizationId, opt.optionId, opt.priceModifier || 0, opt.isDefault || false]);
        }
      }

      await client.query('COMMIT');
      return { itemCustomizationId };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Remove a customization group from an item
   */
  static async removeItemCustomization(itemId, groupId) {
    const query = 'DELETE FROM item_customizations WHERE item_id = $1 AND group_id = $2';
    await db.query(query, [itemId, groupId]);
  }

  /**
   * Get all customizations for a specific item
   */
  static async getItemCustomizations(itemId) {
    // Fetch linkage
    const linkQuery = `
        SELECT ic.*, cg.name as group_name, cg.min_selection, cg.max_selection, cg.is_required
        FROM item_customizations ic
        JOIN customization_groups cg ON ic.group_id = cg.group_id
        WHERE ic.item_id = $1
    `;
    const linkRes = await db.query(linkQuery, [itemId]);
    const links = linkRes.rows;

    if (links.length === 0) return [];

    // Fetch overrides
    const icIds = links.map(l => l.item_customization_id);
    const overridesQuery = `
        SELECT * FROM item_customization_options WHERE item_customization_id = ANY($1::int[])
    `;
    const overridesRes = await db.query(overridesQuery, [icIds]);
    const overrides = overridesRes.rows;

    // Fetch base options (to get names)
    const baseOptionsQuery = `
        SELECT * FROM customization_options 
        WHERE group_id IN (SELECT group_id FROM item_customizations WHERE item_id = $1)
    `;
    const baseOptionsRes = await db.query(baseOptionsQuery, [itemId]);
    const baseOptions = baseOptionsRes.rows;

    // Merge data
    return links.map(link => {
        const linkOverrides = overrides.filter(o => o.item_customization_id === link.item_customization_id);
        const groupOptions = baseOptions.filter(o => o.group_id === link.group_id);

        return {
            ...link,
            options: groupOptions.map(opt => {
                const override = linkOverrides.find(ov => ov.option_id === opt.option_id);
                return {
                    ...opt,
                    price_modifier: override ? override.price_modifier : 0,
                    is_default: override ? override.is_default : false
                };
            })
        };
    });
  }
}

module.exports = CustomizationModel;
