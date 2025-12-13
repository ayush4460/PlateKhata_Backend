const CategoryModel = require('../models/category.model');
const ApiResponse = require('../utils/apiResponse');

class CategoryController {
  static async getAll(req, res) {
    try {
      // Assuming middleware sets req.user.restaurantId for admins
      // But also need to support public access if needed? 
      // Plan says "Admin Panel" management. Frontend customer API might need it too.
      // If public/public access, restaurantId might come from query or slug resolution.
      // Let's use the one from token if available, or query param.
      
      let restaurantId = req.user?.restaurantId;
      if (!restaurantId && req.query.restaurantId) {
        restaurantId = req.query.restaurantId;
      }

      if (!restaurantId) {
        return ApiResponse.error(res, 'Restaurant ID required', 400);
      }

      const categories = await CategoryModel.findAll(restaurantId);
      return ApiResponse.success(res, categories);
    } catch (error) {
      console.error('[CategoryController] Error fetching categories:', error);
      return ApiResponse.error(res, 'Internal server error');
    }
  }

  static async create(req, res) {
    try {
      const { name, displayOrder } = req.body;
      const restaurantId = req.user?.restaurantId;

      if (!restaurantId) {
        return ApiResponse.error(res, 'Unauthorized', 401);
      }
      if (!name) {
        return ApiResponse.error(res, 'Name is required', 400);
      }

      const category = await CategoryModel.create({ restaurantId, name, displayOrder });
      return ApiResponse.success(res, category, 201);
    } catch (error) {
        if (error.code === '23505') { // Unique violation
            return ApiResponse.error(res, 'Category already exists', 409);
        }
      console.error('[CategoryController] Error creating category:', error);
      return ApiResponse.error(res, 'Internal server error');
    }
  }

  static async update(req, res) {
    try {
      const { id } = req.params;
      const updates = req.body;
      
      const category = await CategoryModel.update(id, updates);
      if (!category) {
        return ApiResponse.error(res, 'Category not found', 404);
      }
      return ApiResponse.success(res, category);
    } catch (error) {
      console.error('[CategoryController] Error updating category:', error);
      return ApiResponse.error(res, 'Internal server error');
    }
  }

  static async delete(req, res) {
    try {
      const { id } = req.params;
      // TODO: Check if items are using this category before deleting?
      // DB FK constraint "REFERENCES categories" defaults to NO ACTION, so delete will fail if items exist.
      // We should wrap in try/catch for FK constraint error.
      
      const deleted = await CategoryModel.delete(id);
      if (!deleted) {
         // Could be not found or couldn't delete
         // If delete returned null (0 rows), it wasn't found.
         return ApiResponse.error(res, 'Category not found', 404);
      }
      return ApiResponse.success(res, { deleted: true });
    } catch (error) {
      if (error.code === '23503') { // FK violation
          return ApiResponse.error(res, 'Cannot delete category containing menu items. Move or delete items first.', 400);
      }
      console.error('[CategoryController] Error deleting category:', error);
      return ApiResponse.error(res, 'Internal server error');
    }
  }
}

module.exports = CategoryController;
