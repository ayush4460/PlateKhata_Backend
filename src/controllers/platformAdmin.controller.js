const PlatformAdminService = require('../services/platformAdmin.service');
const ApiResponse = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');

class PlatformAdminController {
  
  static login = catchAsync(async (req, res) => {
    const { email, password } = req.body;
    const result = await PlatformAdminService.login(email, password);
    return ApiResponse.success(res, result, 'Welcome Super Admin');
  });

  static getAllRestaurants = catchAsync(async (req, res) => {
    const result = await PlatformAdminService.getAllRestaurants();
    return ApiResponse.success(res, result);
  });

  static createRestaurant = catchAsync(async (req, res) => {
    const result = await PlatformAdminService.createRestaurant(req.body);
    return ApiResponse.created(res, result, 'Restaurant created successfully');
  });

  static updateRestaurant = catchAsync(async (req, res) => {
    const { id } = req.params;
    const result = await PlatformAdminService.updateRestaurant(id, req.body);
    return ApiResponse.success(res, result, 'Restaurant updated');
  });

  static registerRestaurantAdmin = catchAsync(async (req, res) => {
    // Expecting restaurantId, email, password, username, fullName
    const result = await PlatformAdminService.registerRestaurantAdmin(req.body);
    return ApiResponse.created(res, result, 'Restaurant Admin registered');
  });
}

module.exports = PlatformAdminController;
