const TableModel = require('../models/table.model');
const RestaurantModel = require('../models/restaurant.model');
const QRCodeService = require('../services/qrcode.service');
const ApiResponse = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');
const ApiError = require('../utils/apiError');
const TableService = require('../services/table.service');

class TableController {
  /**
   * Create table
   * POST /api/v1/tables
   */
  // controllers/table.controller.js
  static createTable = catchAsync(async (req, res) => {
    const { tableNumber, capacity } = req.body;
    const restaurantId = req.user.restaurantId;

    // Check if table number already exists
    const existing = await TableModel.findByNumber(tableNumber, restaurantId);

    if (existing) {
      // If it exists but is soft-deleted (disabled), RESTORE it
      if (existing.is_available === false) {
        // Regenerate a QR for the same table_id / table_number
        // Need restaurant slug first
        const restaurant = await RestaurantModel.findById(restaurantId);
        let finalSlug = restaurant.slug || restaurant.restaurant_id || restaurant.id;
        
        const qrCodeUrl = await QRCodeService.generateTableQRCode(
          existing.table_id,
          existing.table_number,
          finalSlug,
          restaurantId
        );

        const restored = await TableModel.update(existing.table_id, {
          capacity,
          isAvailable: true,
          qrCodeUrl,
        });

        return ApiResponse.created(res, restored, 'Table restored successfully');
      }

      throw ApiError.conflict('Table number already exists');
    }

    // Verify restaurant slug
    const restaurant = await RestaurantModel.findById(restaurantId);
    let finalSlug = restaurant.slug;
    if (!finalSlug) {
        finalSlug = restaurant.restaurant_id || restaurant.id;
    }

    const qrCodeUrl = await QRCodeService.generateTableQRCode(
      tableNumber, // wait, generateTableQRCode first arg is tableId
      tableNumber,
      finalSlug,
      restaurantId
    );

    // Wait, first arg of generateTableQRCode is tableId.
    // But tableId is not generated yet!
    // The previous code was: await QRCodeService.generateTableQRCode(tableNumber, tableNumber);
    // This looks like a bug in original code too, using tableNumber as tableId?
    // Let's create table FIRST with null QR, then update it. 
    // Or just pass null/0 as tableId if not needed for the token? 
    // Token uses tableId as 't'. If we pass tableNumber, 't' becomes tableNumber.
    // If tableNumber is unique per restaurant, that is fine.
    
    // Better approach: delegate to TableService.createTable completely if possible.
    // TableService.createTable logic I added handles this correctly:
    // 1. Create table (gets ID)
    // 2. Resolve Slug
    // 3. Generate QR (using real ID)
    // 4. Update Table
    
    // So here in Controller we should just call TableService.createTable if it supports all args?
    // TableService.createTable(data) takes { tableNumber, restaurantId, capacity... }
    
    // So I should replace direct Model calls with Service call.
    
    const table = await TableService.createTable({
        tableNumber,
        capacity,
        restaurantId
    });

    return ApiResponse.created(res, table, 'Table created successfully');

    return ApiResponse.created(res, table, 'Table created successfully');
  });


  /**
   * Get all tables
   * GET /api/v1/tables
   */
  static getAllTables = catchAsync(async (req, res) => {
    const tables = await TableModel.findAll(req.user.restaurantId);
    return ApiResponse.success(res, tables);
  });

  /**
   * Get table by ID
   * GET /api/v1/tables/:id
   */
  static getTableById = catchAsync(async (req, res) => {
    const table = await TableModel.findById(req.params.id);
    if (!table) {
      throw ApiError.notFound('Table not found');
    }
    return ApiResponse.success(res, table);
  });

  /**
   * Update table
   * PUT /api/v1/tables/:id
   */
  static updateTable = catchAsync(async (req, res) => {
    const table = await TableModel.update(req.params.id, req.body);
    if (!table) {
      throw ApiError.notFound('Table not found');
    }
    return ApiResponse.success(res, table, 'Table updated successfully');
  });

  /**
   * clear table
   * POST /api/v1/tables/:id/clear
   */
  static clearTable = catchAsync(async (req, res) => {
    const { id } = req.params;
    await TableService.clearTable(id);
    return ApiResponse.success(res, null, 'Table session cleared successfully');
  });

  /**
   * Delete table
   * DELETE /api/v1/tables/:id
   */
  static deleteTable = catchAsync(async (req, res) => {
    const { id } = req.params;

    await TableService.deleteTable(id);

    return ApiResponse.success(res, null, 'Table deleted successfully');
  });

  /**
   * Get available tables
   * GET /api/v1/tables/available
   */
  static getAvailableTables = catchAsync(async (req, res) => {
    // If public, might need restaurantId from query or elsewhere? 
    // Usually getAvailableTables is for booking or admin?
    // Let's assume restaurantId required in query if not authenticated, or from user.
    let restaurantId = req.user ? req.user.restaurantId : req.query.restaurantId;
     if (!restaurantId) {
        return ApiResponse.badRequest(res, 'Restaurant ID required');
    }
    const tables = await TableModel.getAvailableTables(restaurantId);
    return ApiResponse.success(res, tables);
  });
}

module.exports = TableController;