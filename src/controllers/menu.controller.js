// src/controllers/menu.controller.js
const MenuService = require('../services/menu.service');
const ApiResponse = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');
const { deleteFile } = require('../utils/storage');

class MenuController {
  /**
   * Create menu item
   * POST /api/v1/menu
   */
  static createItem = catchAsync(async (req, res) => {
    const itemData = {
      ...req.body,
      // Use Cloudinary/S3 URL if file uploaded, otherwise null
      // req.file.path for Cloudinary, req.file.location for S3
      imageUrl: req.file ? (req.file.path || req.file.location) : null,
      restaurantId: req.body.restaurantId || req.user.restaurantId,
      customizationAssignments: req.body.customizationAssignments ? JSON.parse(req.body.customizationAssignments) : [],
    };
    
    if (!itemData.restaurantId) {
        throw ApiError.badRequest('Restaurant ID is required');
    }

    const item = await MenuService.createItem(itemData);
    return ApiResponse.created(res, item, 'Menu item created successfully');
  });

  /**
   * Get all menu items
   * GET /api/v1/menu
   */
  static getAllItems = catchAsync(async (req, res) => {
    const { category, isAvailable, isVegetarian, dietaryType } = req.query;

    const filters = {};
    if (category) filters.category = category;
    if (isAvailable !== undefined) filters.isAvailable = isAvailable === 'true';
    if (isVegetarian !== undefined)
      filters.isVegetarian = isVegetarian === 'true';
    if (dietaryType) filters.dietaryType = dietaryType;

    // Multi-tenancy
    if (req.user && req.user.restaurantId) {
      filters.restaurantId = req.user.restaurantId;
    } else if (req.query.restaurantId) {
      filters.restaurantId = req.query.restaurantId;
    }

    const items = await MenuService.getAllItems(filters);
    return ApiResponse.success(res, items);
  });

  /**
   * Get menu item by ID
   * GET /api/v1/menu/:id
   */
  static getItemById = catchAsync(async (req, res) => {
    const item = await MenuService.getItemById(req.params.id);
    return ApiResponse.success(res, item);
  });

  /**
   * Update menu item
   * PUT /api/v1/menu/:id
   */
  static updateItem = catchAsync(async (req, res) => {
    const updates = {
      ...req.body,
    };

    // If new image uploaded
    if (req.file) {
      // Get old image URL to delete from Cloudinary/S3
      const oldItem = await MenuService.getItemById(req.params.id);
      
      if (oldItem && oldItem.image_url) {
        await deleteFile(oldItem.image_url);
      }

      updates.imageUrl = req.file.path || req.file.location; // Cloudinary or S3 URL
    }

    const item = await MenuService.updateItem(req.params.id, updates);
    return ApiResponse.success(res, item, 'Menu item updated successfully');
  });

  /**
   * Delete menu item
   * DELETE /api/v1/menu/:id
   */
  static deleteItem = catchAsync(async (req, res) => {
    const rawId = req.params.id;
    const id = Number.parseInt(rawId, 10);

    if (Number.isNaN(id)) {
      return ApiResponse.badRequest(res, 'Invalid menu item id');
    }

    // Get item to retrieve image URL
    const item = await MenuService.getItemById(id);
    
    if (item && item.image_url) {
      await deleteFile(item.image_url);
    }

    await MenuService.deleteItem(id);
    return ApiResponse.success(res, null, 'Menu item deleted successfully');
  });

  /**
   * Get items by category
   * GET /api/v1/menu/category/:category
   */
  static getItemsByCategory = catchAsync(async (req, res) => {
    let restaurantId = req.user ? req.user.restaurantId : req.query.restaurantId;
    
    // Fallback if not provided (should probably be required)
    if (!restaurantId) {
        return ApiResponse.badRequest(res, 'Restaurant ID required');
    }

    const items = await MenuService.getItemsByCategory(req.params.category, restaurantId);
    return ApiResponse.success(res, items);
  });

  /**
   * Get all categories
   * GET /api/v1/menu/categories
   */
  static getCategories = catchAsync(async (req, res) => {
    let restaurantId = req.user ? req.user.restaurantId : req.query.restaurantId;
        
    if (!restaurantId) {
        return ApiResponse.badRequest(res, 'Restaurant ID required');
    }

    const categories = await MenuService.getCategories(restaurantId);
    return ApiResponse.success(res, categories);
  });

  /**
   * Toggle item availability
   * PATCH /api/v1/menu/:id/availability
   */
  static toggleAvailability = catchAsync(async (req, res) => {
    const item = await MenuService.toggleAvailability(req.params.id);
    return ApiResponse.success(res, item, 'Availability updated successfully');
  });
}

module.exports = MenuController;