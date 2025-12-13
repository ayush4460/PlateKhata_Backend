const TableModel = require('../models/table.model');
const RestaurantModel = require('../models/restaurant.model');
const QRCodeService = require('./qrcode.service');
const SessionService = require('./session.service');
const ApiError = require('../utils/apiError');

class TableService {
    /**
   * Create a new table
   */
    static async createTable(data) {
        const existing = await TableModel.findByNumber(data.tableNumber, data.restaurantId);
        if (existing) {
        throw ApiError.badRequest('Table number already exists');
        }

        const table = await TableModel.create({ ...data, qrCodeUrl: null });

        const restaurant = await RestaurantModel.findById(data.restaurantId);
        if (!restaurant) throw ApiError.notFound('Restaurant not found');
        
        console.log('[DEBUG TableService] Restaurant Data:', JSON.stringify(restaurant, null, 2));

        // Ensure slug exists - Robust Check
        let finalSlug = restaurant.slug;
        if (!finalSlug || finalSlug === 'undefined') {
             // Fallback to ID
             finalSlug = restaurant.restaurant_id || restaurant.id;
             console.warn(`[TableService] Slug missing. Using ID: ${finalSlug}`);
        }

        // Validate finalSlug
        if (!finalSlug) {
            throw new Error('Could not determine Restaurant Slug or ID');
        }

        const qrCodeUrl = await QRCodeService.generateTableQRCode(
            table.table_id, 
            table.table_number, 
            finalSlug,
            restaurant.restaurant_id
        );

        return await TableModel.update(table.table_id, { qrCodeUrl });
    }

    static async getAllTables(restaurantId) {
        return await TableModel.findAll(restaurantId);
    }

    static async getAvailableTables(restaurantId) {
        return await TableModel.getAvailableTables(restaurantId);
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

    await SessionService.clearTable(id);

    if (table.qr_code_url) {
        await QRCodeService.deleteQRCode(table.qr_code_url);
    }

    return await TableModel.update(id, {
        isAvailable: false,
        qrCodeUrl: null,
    });
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