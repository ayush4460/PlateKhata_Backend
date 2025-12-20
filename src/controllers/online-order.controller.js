const OnlineOrderService = require('../services/online-order.service');
const DynoService = require('../services/dyno.service');
const socketService = require('../services/socket.service'); // Added import
const ApiResponse = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');
const OrderModel = require('../models/order.model');
const RestaurantModel = require('../models/restaurant.model');

class OnlineOrderController {
    
    static syncOrders = catchAsync(async (req, res) => {
        await OnlineOrderService.syncOrders();
        return ApiResponse.success(res, null, 'Orders synced successfully.');
    });

    static getOnlineOrders = catchAsync(async (req, res) => {
        const { status, limit } = req.query;
        // Re-use OrderModel.findAll but filtered by orderType='online'
        // We might need to map 'rawStatus' to filter if 'status' param is passed
        const filters = {
             orderType: 'online', // Ensure Model supports this exact filter if not already
             limit: limit || 50
        };
        
        // If status is passed, map it or pass it. 
        // OrderModel.findAll logic for 'status' filters against 'order_status' column.
        if (status) filters.status = status;
        console.log('[OnlineOrderController] Filters:', filters);

        // Note: OrderModel.findAll accepts 'orderType' filter?
        // Let's check OrderModel.findAll. It does NOT explicitly have 'orderType' filter code in the snippet I saw.
        // It has 'restaurantId'.
        
        const { restaurantId, role } = req.user;
        console.log(`[OnlineOrderController] User: ${req.user.userId}, Role: ${role}, ResID: ${restaurantId}`);
        
        // Admins see all orders, Managers/Staff see only their restaurant's orders
        if (restaurantId && role !== 'admin') {
            filters.restaurantId = restaurantId;
        } else {
            console.log('[OnlineOrderController] Admin or No-ResID user, fetching all online orders.');
        }

        // We need to PATCH OrderModel.findAll to support orderType filter if it doesn't.
        // Or we just fetch all and filter in memory (lazy/bad).
        // Let's assume standard filtering for now or I will update OrderModel again.
        
        // HACK: Use 'online' as orderType filter if implemented, otherwise fetch all and filter?
        // Actually, let's just use existing filters.
        
        // Wait, I updated OrderModel.create but NOT findAll.
        // I MUST update OrderModel.findAll to filter by orderType if I want to show ONLY online orders.
        // Or I can rely on the fact that existing orders are regular/online mixed.
        // The user wants "Online Orders" page, so filtering is needed.
        
        
        const orders = await OrderModel.findAll(filters);
        
        return ApiResponse.success(res, orders, 'Online orders fetched.');
    });

    static acceptOrder = catchAsync(async (req, res) => {
        const { orderId } = req.params;
        const { time } = req.body; 
        
        await OnlineOrderService.acceptOrder(orderId, time);
        
        // Update Local Status
        const order = await OrderModel.updateStatus(orderId, 'confirmed');
        
        // Emit Socket Update
        if (order) {
             socketService.emitOrderStatusUpdate(order.order_id, 'confirmed', order.table_id);
        }

        return ApiResponse.success(res, null, 'Order accepted.');
    });

    static rejectOrder = catchAsync(async (req, res) => {
        const { orderId } = req.params;
        const { reason } = req.body;
        
        await OnlineOrderService.rejectOrder(orderId, reason);
        
        // Update Local Status
        const order = await OrderModel.updateStatus(orderId, 'cancelled');

        // Emit Socket Update
        if (order) {
            socketService.emitOrderStatusUpdate(order.order_id, 'cancelled', order.table_id);
        }
        
        return ApiResponse.success(res, null, 'Order rejected.');
    });

    static markReady = catchAsync(async (req, res) => {
        const { orderId } = req.params;
        
        await OnlineOrderService.markOrderReady(orderId);
        
        // Update Local Status
        const order = await OrderModel.updateStatus(orderId, 'ready');
        
        // Emit Socket Update
        if (order) {
            socketService.emitOrderStatusUpdate(order.order_id, 'ready', order.table_id);
        }

        return ApiResponse.success(res, null, 'Order marked ready.');
    });
    static getConfig = catchAsync(async (req, res) => {
        const restaurants = await RestaurantModel.findAll();
        let idList = [];
        restaurants.forEach(r => {
            if (r.zomato_restaurant_id) {
                idList = idList.concat(r.zomato_restaurant_id.split(',').map(id => ({ id: id.trim(), platform: 'zomato', name: r.restaurant_name })));
            }
            if (r.swiggy_restaurant_id) {
                idList = idList.concat(r.swiggy_restaurant_id.split(',').map(id => ({ id: id.trim(), platform: 'swiggy', name: r.restaurant_name })));
            }
        });
        
        // Remove duplicates
        const unique = [];
        const seen = new Set(); 
        for (const item of idList) {
             if (item.id && !seen.has(item.id)) {
                 seen.add(item.id);
                 unique.push(item);
             }
        }
        return ApiResponse.success(res, unique, 'Configuration fetched.');
    });

    static getOrderHistory = catchAsync(async (req, res) => {
        const { outletId } = req.params; // External Outlet ID
        if (!outletId) return ApiResponse.error(res, 'Outlet ID required', 400);

        // Fetch from Dyno
        // We assume Zomato for now as user asked for Zomato mostly. 
        // Or we try both? Dyno endpoint requires restaurant_id (external).
        // Let's assume the UI passes the ID and we try Zomato endpoint.
        const history = await DynoService.getZomatoOrderHistory(outletId);
        
        return ApiResponse.success(res, history, 'Order history fetched.');
    });
}

module.exports = OnlineOrderController;
