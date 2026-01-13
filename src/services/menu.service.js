const MenuModel = require('../models/menu.model');
const ApiError = require('../utils/apiError');

class MenuService {
  /**
   * Create menu item
   */
  static async createItem(itemData) {
    // Separate customizations from item data
    const { customizationAssignments, ...menuItemData } = itemData;

    // 1. Create Menu Item
    const newItem = await MenuModel.create(menuItemData);

    // 2. Handle Customization Assignments
    if (customizationAssignments && Array.isArray(customizationAssignments) && customizationAssignments.length > 0) {
        const CustomizationService = require('./customization.service');
        
        for (const assignment of customizationAssignments) {
            await CustomizationService.assignToItem(
                newItem.item_id, 
                assignment.groupId, 
                assignment.overrides || []
            );
        }
    }

    return newItem;
  }

  /**
   * Get all menu items
   */
  static async getAllItems(filters) {
    return await MenuModel.findAll(filters);
  }

  /**
   * Get menu item by ID
   */
  static async getItemById(itemId) {
    const item = await MenuModel.findById(itemId);
    if (!item) {
      throw ApiError.notFound('Menu item not found');
    }
    return item;
  }

  /**
   * Update menu item
   */
  static async updateItem(itemId, updates) {
    const existingItem = await MenuModel.findById(itemId);
    if (!existingItem) {
      throw ApiError.notFound('Menu item not found');
    }

    return await MenuModel.update(itemId, updates);
  }

  /**
   * Delete menu item
   */
static async deleteItem(itemId) {
  const id = Number.parseInt(itemId, 10);
  if (Number.isNaN(id)) {
    throw ApiError.badRequest('Invalid menu item id');
  }

  const existingItem = await MenuModel.findById(id);
  if (!existingItem) {
    throw ApiError.notFound('Menu item not found');
  }

  return await MenuModel.delete(id);
}


  /**
   * Get items by category
   */
  static async getItemsByCategory(category, restaurantId) {
    return await MenuModel.findByCategory(category, restaurantId);
  }

  /**
   * Get all categories
   */
  static async getCategories(restaurantId) {
    return await MenuModel.getCategories(restaurantId);
  }

  /**
   * Toggle item availability
   */
  static async toggleAvailability(itemId) {
    const item = await MenuModel.findById(itemId);
    if (!item) {
      throw ApiError.notFound('Menu item not found');
    }

    return await MenuModel.update(itemId, {
      isAvailable: !item.is_available,
    });
  }
}

module.exports = MenuService;