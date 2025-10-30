const MenuService = require('../services/menu.service');
const ApiResponse = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');

class MenuController {
  /**
   * Create menu item
   * POST /api/v1/menu
   */
  static createItem = catchAsync(async (req, res) => {
    const itemData = {
      ...req.body,
      imageUrl: req.file ? `/uploads/menu/${req.file.filename}` : null,
    };

    const item = await MenuService.createItem(itemData);
    return ApiResponse.created(res, item, 'Menu item created successfully');
  });

  /**
   * Get all menu items
   * GET /api/v1/menu
   */
  static getAllItems = catchAsync(async (req, res) => {
    const { category, isAvailable, isVegetarian } = req.query;

    const filters = {};
    if (category) filters.category = category;
    if (isAvailable !== undefined) filters.isAvailable = isAvailable === 'true';
    if (isVegetarian !== undefined)
      filters.isVegetarian = isVegetarian === 'true';

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

    if (req.file) {
      updates.imageUrl = `/uploads/menu/${req.file.filename}`;
    }

    const item = await MenuService.updateItem(req.params.id, updates);
    return ApiResponse.success(res, item, 'Menu item updated successfully');
  });

  /**
   * Delete menu item
   * DELETE /api/v1/menu/:id
   */
static deleteItem = catchAsync(async (req, res) => {
  // parse id and validate
  const rawId = req.params.id;
  const id = Number.parseInt(rawId, 10);

  if (Number.isNaN(id)) {
    // If id is invalid, return 400 Bad Request
    return ApiResponse.badRequest(res, 'Invalid menu item id');
  }
  // proceed with numeric id
  await MenuService.deleteItem(id);
  return ApiResponse.success(res, null, 'Menu item deleted successfully');
});


  /**
   * Get items by category
   * GET /api/v1/menu/category/:category
   */
  static getItemsByCategory = catchAsync(async (req, res) => {
    const items = await MenuService.getItemsByCategory(req.params.category);
    return ApiResponse.success(res, items);
  });

  /**
   * Get all categories
   * GET /api/v1/menu/categories
   */
  static getCategories = catchAsync(async (req, res) => {
    const categories = await MenuService.getCategories();
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