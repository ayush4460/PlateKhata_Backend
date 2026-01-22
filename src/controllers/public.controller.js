const RestaurantModel = require('../models/restaurant.model');
const MenuModel = require('../models/menu.model');
const jwt = require('jsonwebtoken');
const ApiResponse = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/apiError');
const PublicService = require('../services/public.service');

class PublicController {
  
  /**
   * Get restaurant by slug (Public)
   * GET /api/v1/public/restaurants/:slug
   */
  static getAllActiveRestaurants = catchAsync(async (req, res) => {
    const restaurants = await PublicService.getAllActiveRestaurants();
    return ApiResponse.success(res, restaurants);
  });

  static getRestaurantBySlug = catchAsync(async (req, res) => {
    const { slug } = req.params;
    const restaurant = await RestaurantModel.findBySlug(slug);
    
    if (!restaurant) {
      throw ApiError.notFound('Restaurant not found');
    }

    if (!restaurant.is_active) {
       throw ApiError.forbidden('Restaurant is currently inactive');
    }

    // Return public details only (sanitize)
    const publicDetails = {
      restaurantId: restaurant.restaurant_id,
      name: restaurant.name,
      address: restaurant.address,
      contactEmail: restaurant.contact_email,
      slug: restaurant.slug
      // Add theme/colors here later
    };

    return ApiResponse.success(res, publicDetails);
  });

  /**
   * Get menu for restaurant public page
   * GET /api/v1/public/restaurants/:slug/menu
   */
  static getMenuBySlug = catchAsync(async (req, res) => {
    const { slug } = req.params;
    const { category, isVegetarian } = req.query;

    const restaurant = await RestaurantModel.findBySlug(slug);
    if (!restaurant) {
      throw ApiError.notFound('Restaurant not found');
    }

    const filters = {
        restaurantId: restaurant.restaurant_id,
        isAvailable: true // Public always only sees available items
    };
    
    if (category) filters.category = category;
    if (isVegetarian === 'true') filters.isVegetarian = true;

    const items = await MenuModel.findAll(filters);
    return ApiResponse.success(res, items);
  });

  /**
   * Verify table token and return table details
   * GET /api/v1/public/tables/verify?token=...
   */
  static verifyTableToken = catchAsync(async (req, res) => {
    const { token } = req.query;
    if (!token) throw ApiError.badRequest('Token is required');

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // decoded.t is tableId
      if (!decoded.t) throw new Error('Invalid token payload');

      // Fetch table to get the number
      const TableService = require('../services/table.service'); 
      // Late import to avoid circular dependency if any? (Safety check)
      const table = await TableService.getTableById(decoded.t);

      return ApiResponse.success(res, {
        tableId: table.table_id,
        tableNumber: table.table_number,
        restaurantId: table.restaurant_id
      });
    } catch (err) {
      throw ApiError.unauthorized('Invalid or expired QR code');
    }
  });

}

module.exports = PublicController;
