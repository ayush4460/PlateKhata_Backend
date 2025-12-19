// backend/src/controllers/settings.controller.js
const SettingsService = require('../services/settings.service');
const ApiResponse = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');

class SettingsController {
  static updateSettings = catchAsync(async (req, res) => {
    const { 
        taxRate, 
        discountRate, 
        upiId, 
        zomatoRestaurantId, 
        swiggyRestaurantId,
        name,
        address,
        contactEmail,
        tagline
    } = req.body;
    const { restaurantId } = req.user;

    if (!restaurantId) {
        throw new Error('User does not have a restaurantId');
    }

    // Update settings table (Financial/App Settings)
    if (taxRate !== undefined) {
        await SettingsService.updateSetting(restaurantId, 'tax_rate', taxRate);
    }

    if (discountRate !== undefined) {
        await SettingsService.updateSetting(restaurantId, 'discount_rate', discountRate);
    }

    if (upiId !== undefined) {
      await SettingsService.updateSetting(restaurantId, 'upi_id', upiId);
    }

    // Update restaurants table (Platform IDs & Core Details)
    const restaurantData = {};
    if (zomatoRestaurantId !== undefined) restaurantData.zomatoRestaurantId = zomatoRestaurantId;
    if (swiggyRestaurantId !== undefined) restaurantData.swiggyRestaurantId = swiggyRestaurantId;
    if (name !== undefined) restaurantData.name = name;
    if (address !== undefined) restaurantData.address = address;
    if (contactEmail !== undefined) restaurantData.contactEmail = contactEmail;
    if (tagline !== undefined) restaurantData.tagline = tagline;

    let updatedRestaurant = null;
    if (Object.keys(restaurantData).length > 0) {
        updatedRestaurant = await SettingsService.updateRestaurantDetails(restaurantId, restaurantData);
    }

    return ApiResponse.success(res, { 
        taxRate, 
        discountRate, 
        upiId, 
        updatedRestaurant 
    }, 'Settings updated successfully.');
  });

  static getPublicSettings = catchAsync(async (req, res) => {
    // We need to know WHICH restaurant? 
    let { restaurantId } = req.query;
    if (!restaurantId && req.user && req.user.restaurantId) {
        restaurantId = req.user.restaurantId;
    }

    if (restaurantId && isNaN(parseInt(restaurantId))) {
         return ApiResponse.error(res, 'Invalid Restaurant ID', 400); 
    }

    const RestaurantModel = require('../models/restaurant.model');
    
    let mainRest = {};
    if (restaurantId) {
        mainRest = await RestaurantModel.findById(restaurantId) || {};
    } else {
        const restaurants = await RestaurantModel.findAll();
        mainRest = restaurants[0] || {};
        restaurantId = mainRest.restaurant_id; // Set ID if we fell back to default
    }

    // Fetch settings for this specific restaurant
    const taxRateRaw = await SettingsService.getSetting('tax_rate', restaurantId);
    const discountRateRaw = await SettingsService.getSetting('discount_rate', restaurantId);
    const upiId = await SettingsService.getSetting('upi_id', restaurantId);

    const taxRate = taxRateRaw != null ? parseFloat(taxRateRaw) : 0;
    const discountRate = discountRateRaw != null ? parseFloat(discountRateRaw) : 0;

    return ApiResponse.success(
      res,
      {
        taxRate,
        discountRate,
        upiId: upiId || '',
        zomatoRestaurantId: mainRest.zomato_restaurant_id || '',
        swiggyRestaurantId: mainRest.swiggy_restaurant_id || '',
        restaurantName: mainRest.name || '',
        restaurantAddress: mainRest.address || '',
        contactEmail: mainRest.contact_email || '',
        restaurantSlug: mainRest.slug || '',
        tagline: mainRest.tagline || ''
      },
      'Settings fetched successfully.'
    );
  });
}



module.exports = SettingsController;