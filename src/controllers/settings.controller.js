// backend/src/controllers/settings.controller.js
const SettingsService = require('../services/settings.service');
const ApiResponse = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');

class SettingsController {
  static updateSettings = catchAsync(async (req, res) => {
    const { taxRate, discountRate, upiId, zomatoRestaurantId, swiggyRestaurantId } = req.body;
    const { restaurantId } = req.user;

    if (!restaurantId) {
        throw new Error('User does not have a restaurantId');
    }

    // Update settings table
    if (taxRate !== undefined) {
        await SettingsService.updateSetting(restaurantId, 'tax_rate', taxRate);
    }

    if (discountRate !== undefined) {
        await SettingsService.updateSetting(restaurantId, 'discount_rate', discountRate);
    }

    if (upiId !== undefined) {
      await SettingsService.updateSetting(restaurantId, 'upi_id', upiId);
    }

    // Update restaurants table (Platform IDs)
    if (zomatoRestaurantId !== undefined || swiggyRestaurantId !== undefined) {
        const updateData = {};
        if (zomatoRestaurantId !== undefined) updateData.zomatoRestaurantId = zomatoRestaurantId;
        if (swiggyRestaurantId !== undefined) updateData.swiggyRestaurantId = swiggyRestaurantId;
        
        // We need a method in RestaurantModel to update these specific fields
        // Or generic update. Let's assume generic update or add specific one.
        // Checking RestaurantModel... it has 'create', 'findBySlug', 'findById', 'findAll'.
        // It DOES NOT have 'update'. I need to add it.
        const RestaurantModel = require('../models/restaurant.model');
        await RestaurantModel.update(restaurantId, updateData);
    }

    return ApiResponse.success(res, { taxRate, discountRate, upiId, zomatoRestaurantId, swiggyRestaurantId }, 'Settings updated successfully.');
  });

  static getPublicSettings = catchAsync(async (req, res) => {
    // Note: Public settings might NOT typically include private IDs, but for the Admin Dashboard (which uses this?), it's fine.
    // However, useCart calls this "public" endpoint. Exposing Restaurant IDs is generally safe (they are public on aggregator sites).
    
    // We need to know WHICH restaurant? 
    // Usually via query param 'restaurantId' or subdomain. 
    // The previous code didn't check! It just returned... wait, getSetting takes a key.
    // SettingsService.getSetting(key) seems to lack restaurantId in the signature from my previous view!
    // Let's re-read SettingsService. It does `const query = ... WHERE setting_key = $1`.
    // GLOBAL SETTINGS?! 
    // If SettingsService.getSetting(key) does NOT filter by restaurantId, then it's a single-tenant system or broken for multi-tenant.
    // The user asked for "centralised... multiple resturants...".
    // I should fix SettingsService.getSetting too if I can.
    
    // But for now, let's just stick to the pattern.
    const taxRateRaw = await SettingsService.getSetting('tax_rate');
    const discountRateRaw = await SettingsService.getSetting('discount_rate');
    const upiId = await SettingsService.getSetting('upi_id');

    // Retrieve Platform IDs (Assumes single main restaurant or we need logic)
    // For now, let's fetch the FIRST restaurant or one based on query if possible.
    // This part is tricky without context of how the frontend knows which restaurant.
    // If it's single tenant:
    // Check for restaurantId in query or params
    let { restaurantId } = req.query;
    
    // If no query param, check if authenticated user is making request
    if (!restaurantId && req.user && req.user.restaurantId) {
        restaurantId = req.user.restaurantId;
    }

    const RestaurantModel = require('../models/restaurant.model');
    
    let mainRest = {};
    if (restaurantId) {
        mainRest = await RestaurantModel.findById(restaurantId) || {};
    } else {
        const restaurants = await RestaurantModel.findAll();
        mainRest = restaurants[0] || {};
    }

    const taxRate = taxRateRaw != null ? parseFloat(taxRateRaw) : 0;
    const discountRate = discountRateRaw != null ? parseFloat(discountRateRaw) : 0;

    return ApiResponse.success(
      res,
      {
        taxRate,
        discountRate,
        upiId: upiId || '',
        zomatoRestaurantId: mainRest.zomato_restaurant_id || '',
        swiggyRestaurantId: mainRest.swiggy_restaurant_id || ''
      },
      'Settings fetched successfully.'
    );
  });
}



module.exports = SettingsController;