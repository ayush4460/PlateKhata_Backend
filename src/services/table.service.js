const TableModel = require('../models/table.model');
const QRCodeService = require('./qrcode.service');
const SessionService = require('./session.service');
const ApiError = require('../utils/apiError');

class TableService {
    /**
   * Create a new table
   */
    static async createTable(data) {
        const existing = await TableModel.findByNumber(data.tableNumber);
        if (existing) {
        throw ApiError.badRequest('Table number already exists');
        }

        const table = await TableModel.create({ ...data, qrCodeUrl: null });

        const qrCodeUrl = await QRCodeService.generateTableQRCode(table.table_id, table.table_number);

        return await TableModel.update(table.table_id, { qrCodeUrl });
    }

    static async getAllTables() {
        return await TableModel.findAll();
    }

    static async getAvailableTables() {
        return await TableModel.getAvailableTables();
    }

    static async getTableById(id) {
        const table = await TableModel.findById(id);
        if (!table) {
        throw ApiError.notFound('Table not found');
        }
        return table;
    }

    static async updateTable(id, data) {
        const table = await TableModel.findById(id);
        if (!table) {
        throw ApiError.notFound('Table not found');
        }

        if (data.tableNumber && data.tableNumber !== table.table_number) {
        const existing = await TableModel.findByNumber(data.tableNumber);
        if (existing) {
            throw ApiError.badRequest('Table number already exists');
        }
        }
        return await TableModel.update(id, data);
    }

    static async deleteTable(id) {
        const table = await TableModel.findById(id);
        if (!table) {
        throw ApiError.notFound('Table not found');
        }

        if (table.qr_code_url) {
            await QRCodeService.deleteQRCode(table.qr_code_url);
        }

        return await TableModel.delete(id);
    }

    /**
     * Clear session for a table
     */
    static async clearTable(id) {
        const table = await TableModel.findById(id);
        if (!table) {
        throw ApiError.notFound('Table not found');
        }
        return await SessionService.clearTable(id);
    }
}

module.exports = TableService;