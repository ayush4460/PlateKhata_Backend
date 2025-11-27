// backend/src/controllers/settings.controller.js
const SettingsService = require('../services/settings.service');
const ApiResponse = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');

class SettingsController {
  static updateSettings = catchAsync(async (req, res) => {
    const { taxRate, discountRate } = req.body;
    
    if (taxRate !== undefined) {
        await SettingsService.updateSetting('tax_rate', taxRate);
    }
    
    if (discountRate !== undefined) {
        await SettingsService.updateSetting('discount_rate', discountRate);
    }
    
    return ApiResponse.success(res, { taxRate, discountRate }, 'Settings updated successfully.');
  });
}

module.exports = SettingsController;