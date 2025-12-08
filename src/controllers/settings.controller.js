// backend/src/controllers/settings.controller.js
const SettingsService = require('../services/settings.service');
const ApiResponse = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');

class SettingsController {
  static updateSettings = catchAsync(async (req, res) => {
    const { taxRate, discountRate, upiId } = req.body;

    if (taxRate !== undefined) {
        await SettingsService.updateSetting('tax_rate', taxRate);
    }

    if (discountRate !== undefined) {
        await SettingsService.updateSetting('discount_rate', discountRate);
    }

    if (upiId !== undefined) {
      await SettingsService.updateSetting('upi_id', upiId);
    }

    return ApiResponse.success(res, { taxRate, discountRate, upiId }, 'Settings updated successfully.');
  });

  static getPublicSettings = catchAsync(async (req, res) => {
    const taxRateRaw = await SettingsService.getSetting('tax_rate');
    const discountRateRaw = await SettingsService.getSetting('discount_rate');
    const upiId = await SettingsService.getSetting('upi_id');

    const taxRate = taxRateRaw != null ? parseFloat(taxRateRaw) : 0;
    const discountRate = discountRateRaw != null ? parseFloat(discountRateRaw) : 0;

    return ApiResponse.success(
      res,
      {
        taxRate,
        discountRate,
        upiId: upiId || '',
      },
      'Settings fetched successfully.'
    );
  });
}



module.exports = SettingsController;