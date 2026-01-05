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
    const { tableNumber, capacity, restaurantId } = req.body;

    // Use passed restaurantId, fallback to user's restaurantId, or error
    const targetRestaurantId = restaurantId || req.user.restaurantId;

    if (!targetRestaurantId) {
        throw ApiError.badRequest('Restaurant ID is required');
    }

    // Check if table number already exists
    const existing = await TableModel.findByNumber(tableNumber, targetRestaurantId);

    if (existing) {
      // If it exists but is soft-deleted (disabled), RESTORE it
      if (existing.is_available === false) {
        // Regenerate a QR for the same table_id / table_number
        // Need restaurant slug first
        const restaurant = await RestaurantModel.findById(targetRestaurantId);
        let finalSlug = restaurant.slug || restaurant.restaurant_id || restaurant.id;
        
        const qrCodeUrl = await QRCodeService.generateTableQRCode(
          existing.table_id,
          existing.table_number,
          finalSlug,
          targetRestaurantId
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
    const restaurant = await RestaurantModel.findById(targetRestaurantId);
    if (!restaurant) throw ApiError.notFound('Restaurant not found');

    // Delegate to Service
    const table = await TableService.createTable({
        tableNumber,
        capacity,
        restaurantId: targetRestaurantId
    });

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

  /**
   * Move table session
   * POST /api/v1/tables/move
   */
  static moveTable = catchAsync(async (req, res) => {
    const { sourceTableId, targetTableId } = req.body;
    const restaurantId = req.user.restaurantId;

    if (!sourceTableId || !targetTableId) {
      throw ApiError.badRequest('Source and target table IDs are required');
    }

    await TableService.moveTable(sourceTableId, targetTableId, restaurantId);

    return ApiResponse.success(res, null, 'Table moved successfully');
  });
  /**
   * Update table customer details (for active session)
   * PATCH /api/v1/tables/:id/customer
   */
  static updateCustomerDetails = catchAsync(async (req, res) => {
    const { id } = req.params;
    const { customerName, customerPhone } = req.body;
    const restaurantId = req.user.restaurantId;

    await TableService.updateCustomerDetails(id, customerName, customerPhone, restaurantId);

    // Real-time update via SocketService
    const socketService = require('../services/socket.service');
    socketService.emitTableUpdate(id, restaurantId, {
        customerName,
        customerPhone
    });

    return ApiResponse.success(res, null, 'Customer details updated successfully');
  });
}

module.exports = TableController;