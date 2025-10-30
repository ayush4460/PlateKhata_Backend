// backend/src/controllers/settings.controller.js
const SettingsService = require('../services/settings.service');
const ApiResponse = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');

class SettingsController {
  
  /**
   * Update the tax rate setting
   * PATCH /api/v1/settings/tax
   */
  static updateTaxRate = catchAsync(async (req, res) => {
    const { taxRate } = req.body;
    
    // Call the service function to save the tax rate to the DB
    await SettingsService.updateSetting('tax_rate', taxRate);
    
    return ApiResponse.success(res, { newTaxRate: taxRate }, 'Tax rate updated successfully.');
  });


}

module.exports = SettingsController;