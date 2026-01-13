const CustomizationService = require('../services/customization.service');
const ApiResponse = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');

class CustomizationController {
  
  static getGroups = catchAsync(async (req, res) => {
    // Assuming restaurantId is attached to user by auth middleware
    const restaurantId = req.user.restaurantId;
    if (!restaurantId) {
        throw new Error('Restaurant ID not found in user context');
    }
    const result = await CustomizationService.getGroups(restaurantId);
    return ApiResponse.success(res, result);
  });

  static createGroup = catchAsync(async (req, res) => {
    const restaurantId = req.user.restaurantId;
    const result = await CustomizationService.createGroupWithOptions({ 
        ...req.body, 
        restaurantId 
    });
    return ApiResponse.created(res, result, 'Customization group created successfully');
  });

  static updateGroup = catchAsync(async (req, res) => {
    const { id } = req.params;
    const result = await CustomizationService.updateGroup(id, req.body);
    return ApiResponse.success(res, result, 'Customization group updated successfully');
  });

  static deleteGroup = catchAsync(async (req, res) => {
    const { id } = req.params;
    await CustomizationService.deleteGroup(id);
    return ApiResponse.success(res, null, 'Customization group deleted successfully');
  });

  static assignToItem = catchAsync(async (req, res) => {
    const { itemId, groupId, options } = req.body;
    await CustomizationService.assignToItem(itemId, groupId, options);
    return ApiResponse.success(res, null, 'Customization assigned to item successfully');
  });

  static removeItemCustomization = catchAsync(async (req, res) => {
    const { itemId, groupId } = req.params; // Expect query or params? Let's use body for remove or specific route
    // Actually, distinct route is better: DELETE /customizations/item/:itemId/group/:groupId
    // Or just use query params if strictly REST.
    // Let's stick to the route definition I will make.
    await CustomizationService.removeItemCustomization(itemId, groupId);
    return ApiResponse.success(res, null, 'Customization removed from item');
  });

  static getItemCustomizations = catchAsync(async (req, res) => {
    const { itemId } = req.params;
    const result = await CustomizationService.getItemCustomizations(itemId);
    return ApiResponse.success(res, result);
  });
}

module.exports = CustomizationController;
