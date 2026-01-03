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

        // NEW: Complete all active active/pending orders for this table before clearing
        // We update based on table_id to be robust against session states
        const db = require('../config/database');
        
        console.log(`[TableService] clearTable: Completing orders for table ${id}`);
        
        await db.query(
            `UPDATE orders 
                SET order_status = 'completed', updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
                WHERE table_id = $1 AND order_status NOT IN ('cancelled', 'completed')`,
            [id]
        );

        return await SessionService.clearTable(id);
    }

    /**
     * Move table session to another table
     */
    /**
     * Move table session to another table
     */
    static async moveTable(sourceTableId, targetTableId, restaurantId) {
        const db = require('../config/database');
        
        console.log(`[TableService] Moving table: ${sourceTableId} -> ${targetTableId} (Restaurant: ${restaurantId})`);

        // 1. Verify source table
        const sourceTable = await TableModel.findById(sourceTableId);
        if (!sourceTable || sourceTable.restaurant_id !== restaurantId) {
            throw ApiError.notFound('Source table not found or access denied');
        }

        // 2. Verify target table
        const targetTable = await TableModel.findById(targetTableId);
        if (!targetTable || targetTable.restaurant_id !== restaurantId) {
            throw ApiError.notFound('Target table not found or access denied');
        }

        if (!targetTable.is_available) {
            throw ApiError.badRequest('Target table is not available (disabled)');
        }

        // 3. Check if target table is occupied
        // We check for any active orders at the target table
        const targetOccupiedRes = await db.query(
            `SELECT 1 FROM orders
             WHERE table_id = $1 
             AND order_status NOT IN ('completed', 'cancelled')
             LIMIT 1`,
            [targetTableId]
        );

        if (targetOccupiedRes.rows.length > 0) {
            throw ApiError.badRequest('Target table is already occupied with active orders');
        }

        // 4. Find sessions to move
        // a) Find session IDs from active orders at source table
        const activeOrderSessionsRes = await db.query(
            `SELECT DISTINCT session_id FROM orders 
             WHERE table_id = $1 
             AND order_status NOT IN ('completed', 'cancelled')`,
            [sourceTableId]
        );
        
        // b) Find active session from sessions table (even if no orders yet)
        const activeSessionsRes = await db.query(
            `SELECT session_id FROM sessions 
             WHERE table_id = $1 AND is_active = TRUE`,
            [sourceTableId]
        );

        const sessionIds = new Set([
            ...activeOrderSessionsRes.rows.map(r => r.session_id),
            ...activeSessionsRes.rows.map(r => r.session_id)
        ].filter(id => id != null));

        if (sessionIds.size === 0) {
            console.warn(`[TableService] No active sessions or orders found for source table ${sourceTableId}`);
            throw ApiError.badRequest('Source table has no active session or orders to move');
        }

        console.log(`[TableService] Found ${sessionIds.size} sessions to move: ${Array.from(sessionIds).join(', ')}`);

        // 5. Execute move in transaction
        const client = await db.pool.connect();
        try {
            await client.query('BEGIN');

            for (const sessionId of sessionIds) {
                // Move session
                const sessionUpdate = await client.query(
                    'UPDATE sessions SET table_id = $1 WHERE session_id = $2',
                    [targetTableId, sessionId]
                );
                console.log(`[TableService] Session ${sessionId} update rowCount: ${sessionUpdate.rowCount}`);

                // Move orders
                const ordersUpdate = await client.query(
                    'UPDATE orders SET table_id = $1 WHERE session_id = $2',
                    [targetTableId, sessionId]
                );
                console.log(`[TableService] Session ${sessionId} orders update rowCount: ${ordersUpdate.rowCount}`);
            }

            await client.query('COMMIT');
            console.log(`[TableService] Successfully moved ${sessionIds.size} sessions to table ${targetTableId}`);
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('[TableService] Transaction failed, rolled back:', error);
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = TableService;
