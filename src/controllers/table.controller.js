const TableModel = require('../models/table.model');
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

    // Check if table number already exists
    const existing = await TableModel.findByNumber(tableNumber);

    if (existing) {
      // If it exists but is soft-deleted (disabled), RESTORE it
      if (existing.is_available === false) {
        // Regenerate a QR for the same table_id / table_number
        const qrCodeUrl = await QRCodeService.generateTableQRCode(
          existing.table_id,
          existing.table_number
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

    const qrCodeUrl = await QRCodeService.generateTableQRCode(
      tableNumber,
      tableNumber
    );

    const table = await TableModel.create({
      tableNumber,
      capacity,
      qrCodeUrl,
    });

    return ApiResponse.created(res, table, 'Table created successfully');
  });


  /**
   * Get all tables
   * GET /api/v1/tables
   */
  static getAllTables = catchAsync(async (req, res) => {
    const tables = await TableModel.findAll();
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
    const tables = await TableModel.getAvailableTables();
    return ApiResponse.success(res, tables);
  });
}

module.exports = TableController;