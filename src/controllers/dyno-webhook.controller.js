const OnlineOrderService = require('../services/online-order.service');
const RestaurantModel = require('../models/restaurant.model');
const db = require('../config/database');

class DynoWebhookController {

    /**
     * POST /orders
     * Incoming New Orders from Dyno
     */
    static async handleIncomingOrders(req, res) {
        try {
            const { orders } = req.body;
            console.log(`[DynoWebhook] Received ${orders?.length || 0} incoming orders.`);

            if (!orders || !Array.isArray(orders)) {
                return res.status(400).json({ error: 'Invalid payload structure' });
            }

            // Fetch restaurants once to map IDs
            const restaurants = await RestaurantModel.findAll();
            const activeRestaurants = restaurants.filter(r => r.zomato_restaurant_id || r.swiggy_restaurant_id);

            const insertedOrders = [];
            
            for (const orderWrapper of orders) {
                // Dyno Structure: { data: {...}, vendor: 'Zomato', resId: '...', orderId: '...' }
                
                const rawOrder = {
                    platform: (orderWrapper.vendor || '').toLowerCase(),
                    bucketStatus: 'new_orders', 
                    order: orderWrapper.data 
                };

                // For Swiggy, vendor='Swiggy', data might be different.
                if (rawOrder.platform === 'swiggy') {
                    Object.assign(rawOrder, orderWrapper.data); 
                }

                await OnlineOrderService.processSingleOrder(rawOrder, activeRestaurants);
                insertedOrders.push({
                    status: 200,
                    orderId: orderWrapper.orderId,
                    message: `Order No. ${orderWrapper.orderId} Inserted Successfully`
                });
            }

            return res.status(200).json(insertedOrders);
        } catch (error) {
            console.error('[DynoWebhook] Error processing incoming orders:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    /**
     * GET /{restaurantId}/orders/status
     * Polled by Dyno Client to check for pending actions (Accept/Ready)
     */
    static async getPendingActions(req, res) {
        try {
            const { restaurantId } = req.params;
            
            const allRes = await RestaurantModel.findAll();
            const targetRes = allRes.find(r => {
                 const zIds = (r.zomato_restaurant_id || '').split(',').map(id => id.trim());
                 const sIds = (r.swiggy_restaurant_id || '').split(',').map(id => id.trim());
                 return zIds.includes(restaurantId) || sIds.includes(restaurantId);
            });
            
            if (!targetRes) {
                return res.status(200).json({ orderHistory: false, orders: [] });
            }

            const pendingOrders = await db.query(
                `SELECT external_order_id, dyno_pending_action FROM orders 
                 WHERE restaurant_id = $1 AND dyno_pending_action IN (1, 3)`,
                [targetRes.restaurant_id]
            );

            const payload = pendingOrders.rows.map(o => ({
                orderId: o.external_order_id,
                resId: restaurantId,
                status: o.dyno_pending_action,
                prepTime: 30 
            }));

            return res.status(200).json({
                orderHistory: false, 
                orders: payload
            });

        } catch (error) {
            console.error('[DynoWebhook] Error fetching pending actions:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /orders/{orderId}/status
     * Dyno Client confirms it performed the action
     */
    static async updateActionStatus(req, res) {
        try {
            const { orderId } = req.params;
            const { statusCode } = req.body; 

            console.log(`[DynoWebhook] Action Confirmation for ${orderId}: Code ${statusCode}`);

            // Clear the pending action
            await db.query(
                `UPDATE orders SET dyno_pending_action = 0 WHERE external_order_id = $1`,
                [orderId]
            );

            // Optionally update internal status if we want to confirm it "Really" happened
            if (statusCode === 2) {
                await db.query(`UPDATE orders SET order_status = 'confirmed' WHERE external_order_id = $1`, [orderId]);
            } else if (statusCode === 4) {
                await db.query(`UPDATE orders SET order_status = 'ready' WHERE external_order_id = $1`, [orderId]);
            }

            return res.status(200).json({
                status: statusCode,
                message: `Updated the status to ${statusCode} for order Id ${orderId}`
            });

        } catch (error) {
            console.error('[DynoWebhook] Error updating action status:', error);
            return res.status(500).json({ error: error.message });
        }
    }

    /**
     * POST /{restaurantId}/orders/history
     */
    static async handleHistory(req, res) {
        return res.status(200).json({ status: 200, message: "Request is Successful" });
    }
}

module.exports = DynoWebhookController;
