const MenuModel = require('../models/menu.model');
const ApiError = require('../utils/apiError');

class MenuService {
  /**
   * Create menu item
   */
  static async createItem(itemData) {
    return await MenuModel.create(itemData);
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