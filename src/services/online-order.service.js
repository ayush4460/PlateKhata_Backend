// backend/src/services/online-order.service.js
const DynoService = require('./dyno.service');
const OrderModel = require('../models/order.model');
const RestaurantModel = require('../models/restaurant.model');
const db = require('../config/database');

class OnlineOrderService {
    
    /**
     * Map Dyno status to internal status
     */
    /**
     * Map Dyno status to internal status
     */
    static mapStatus(dynoStatus) {
        const statusMap = {
            'PLACED': 'pending',
            'new_orders': 'pending', 
            
            'ACCEPTED': 'confirmed',
            
            'PREPARING': 'preparing', 
            'preparing_orders': 'preparing',

            'FOOD_READY': 'ready',
            'READY': 'ready', 
            'ready_orders': 'ready',

            'DISPATCHED': 'completed', 
            'dispatched_orders': 'completed',
            'DELIVERED': 'completed',
            'completed_orders': 'completed',

            'CANCELLED': 'cancelled',
            'REJECTED': 'cancelled'
        };
        return statusMap[dynoStatus] || 'pending';
    }
 
    /**
     * Sync orders from Dyno
     */
    static async syncOrders(targetRestaurantId = null) {
        console.log(`[OnlineOrderService] Starting sync... Target ResID: ${targetRestaurantId || 'All'}`);
        
        // 1. Get all restaurants with mapped IDs
        const restaurants = await RestaurantModel.findAll();
        let activeRestaurants = restaurants.filter(r => r.zomato_restaurant_id || r.swiggy_restaurant_id);
        
        // SCOPED SYNC: If user triggered sync, only check THEIR restaurant to avoid ID collision conflicts
        if (targetRestaurantId) {
            activeRestaurants = activeRestaurants.filter(r => String(r.restaurant_id) === String(targetRestaurantId));
        }

        if (activeRestaurants.length === 0) {
            console.log('[OnlineOrderService] No restaurants configured for online orders.');
            return;
        }

        // 2. Fetch orders from Dyno
        const rawOrders = await DynoService.fetchOrders(); 

        if (!rawOrders || !Array.isArray(rawOrders)) {
            console.log('[OnlineOrderService] No orders fetched or invalid response.');
            return;
        }

        console.log(`[OnlineOrderService] Fetched ${rawOrders.length} orders.`);

        // 3. Process each order
        for (const order of rawOrders) {
            try {
                await this.processSingleOrder(order, activeRestaurants);
            } catch (err) {
                console.error(`[OnlineOrderService] Failed to process order:`, err);
            }
        }
    }

    static async processSingleOrder(rawOrder, restaurants) {
        // Normalize Data
        let externalId, remoteResId, platform, rawStatus, totalAmount, taxAmount, customerName;
        
        platform = rawOrder.platform || 'unknown';

        if (platform === 'zomato' && rawOrder.order) {
            // Zomato Detail Structure
            const zDetails = rawOrder.order;
            externalId = zDetails.id;
            remoteResId = zDetails.resId; // ID from Zomato (e.g. 19520792)
            
            // Prefer Bucket Status (Source of Truth for Dashboard)
            rawStatus = rawOrder.bucketStatus || zDetails.state;
            
            // Amount
            const cart = zDetails.cartDetails || {};
            
            // PRIORITY: Total Merchant Bill (Final Amount to be shown)
            // JSON: cart.total.amountDetails.amountTotalCost (97.36) or displayCost ("₹97.36")
            const merchantTotal = cart.total?.amountDetails?.amountTotalCost;
            totalAmount = (merchantTotal !== undefined) ? merchantTotal : (cart.total?.amountDetails?.totalCost || 0);

            // Tax: try to find a tax charge
            taxAmount = 0; 
            if (cart.charges) {
                const taxCharge = cart.charges.find(c => c.amountDetails?.type === 'tax');
                if (taxCharge) taxAmount = taxCharge.amountDetails?.amountTotalCost || 0;
            }

            customerName = zDetails.creator?.name || 'Zomato Customer';
            
            // Extract Rider Details & Instructions
            const riderElement = (zDetails.supportingRiderDetails || [])[0];
            const riderName = riderElement?.name || '';
            const riderPhone = riderElement?.phone || '';
            
            // Order Instructions (e.g., Cutlery)
            const instructions = (zDetails.orderMessages || [])
                .map(m => m.value?.message)
                .filter(Boolean)
                .join(', ');
            
            // Store Rider info in special_instructions JSON string or concatenated text?
            // "Cutlery needed. Rider: Name (Phone)"
            let extraInfo = instructions;
            if (riderName) extraInfo += (extraInfo ? '. ' : '') + `Rider: ${riderName}`;
            if (riderPhone) extraInfo += ` (${riderPhone})`;

            // We'll store this in specialInstructions column
            var specialInstructions = extraInfo;
            // Also store Rider Phone in customer_phone as it's more actionable for the restaurant than masked user phone
            // Also store Rider Phone in customer_phone as it's more actionable for the restaurant than masked user phone
            let creatorPhone = '';
            if (zDetails.creator?.phone) {
                const isd = zDetails.creator.countryIsdCode || '';
                creatorPhone = isd + zDetails.creator.phone;
            }
            var phoneToStore = riderPhone || creatorPhone || null;

        } else {
            // Default/Swiggy (Assumed Flat)
            externalId = rawOrder.id;
            remoteResId = rawOrder.restaurant_id;
            rawStatus = rawOrder.status;
            totalAmount = rawOrder.details?.order_total || 0;
            taxAmount = rawOrder.details?.taxes || 0;
            customerName = rawOrder.customer?.name || 'Online Customer';
            var specialInstructions = rawOrder.instructions || '';
            var phoneToStore = rawOrder.customer?.phone || '';
        }

        // Identify Restaurant (Support CSV IDs)
        const restaurant = restaurants.find(r => {
            const zIds = (r.zomato_restaurant_id || '').split(',').map(id => id.trim());
            const sIds = (r.swiggy_restaurant_id || '').split(',').map(id => id.trim());
            // remoteResId might be number or string
            return zIds.includes(String(remoteResId)) || sIds.includes(String(remoteResId));
        });

        if (restaurant) {
             console.log(`[OnlineOrderService] Matched Restaurant: ${restaurant.restaurant_name} (ID: ${restaurant.restaurant_id}) for External ResID: ${remoteResId}`);
        }

        if (!restaurant) {
            console.warn(`[OnlineOrderService] Unknown restaurant ID: ${remoteResId} (Platform: ${platform}). Configured IDs:`, restaurants.map(r => `Z:[${r.zomato_restaurant_id}]/S:[${r.swiggy_restaurant_id}]`));
            return;
        }

        // Check if exists
    const checkQuery = `SELECT order_id, order_status, raw_status FROM orders WHERE external_order_id = $1 AND external_platform = $2`;
    const existing = await db.query(checkQuery, [externalId, platform]);
    
    // console.log(`[OnlineOrderService] Checking existing: ExtID=${externalId}, Plat=${platform}, ExistingCount=${existing.rows.length}`);

    if (existing.rows.length > 0) {
        const existingOrder = existing.rows[0];
        const newInternalStatus = this.mapStatus(rawStatus);
        
        // Check if status changed (Sync Update)
        if (existingOrder.raw_status !== rawStatus || existingOrder.order_status !== newInternalStatus) {
            console.log(`[OnlineOrderService] Updating status for Order #${existingOrder.order_id}: ${existingOrder.order_status} -> ${newInternalStatus} (${rawStatus})`);
            
            await db.query(
                `UPDATE orders SET order_status = $1, raw_status = $2, updated_at = CURRENT_TIMESTAMP WHERE order_id = $3`,
                [newInternalStatus, rawStatus, existingOrder.order_id]
            );
        }
        return;
    }    

        // Create order
        // SIMPLIFIED PRICING: User requested to ignore tax calculation and just show Total.
        // We set subtotal = total, and tax = 0 to avoid DB triggers or UI logic adding extra costs.
        const subtotal = totalAmount;
        const appliedRate = 0;
        taxAmount = 0; // Force 0 tax

        const orderData = {
            restaurantId: restaurant.restaurant_id,
            tableId: null,
            customerName: customerName,
            customerPhone: phoneToStore, 
            subtotal: subtotal,
            taxAmount: taxAmount,
            totalAmount: totalAmount,
            appliedTaxRate: appliedRate,
            specialInstructions: specialInstructions, // Added Special Instructions
            orderStatus: this.mapStatus(rawStatus),
            paymentStatus: 'Approved',
            orderType: 'online', 
            
            externalOrderId: externalId,
            externalPlatform: platform,
            dynoOrderId: externalId, 
            rawStatus: rawStatus,
            externalOutletId: String(remoteResId)
        };

        const newOrder = await OrderModel.create(orderData);
        
        // Sync Items
        let orderItems = [];
        // Zomato structure: order.cartDetails.items.dishes (Array)
        if (platform === 'zomato' && rawOrder.order?.cartDetails?.items?.dishes) {
             orderItems = rawOrder.order.cartDetails.items.dishes.map(i => ({
                 itemId: null, // External item
                 itemName: i.name,
                 price: parseFloat(i.unitCost || 0),
                 quantity: parseInt(i.quantity || 1),
                 specialInstructions: '',
                 itemCategory: 'online',
                 spiceLevel: null
             }));
        } else if (rawOrder.items) {
             // Generic/Swiggy fallbacks
             orderItems = rawOrder.items.map(i => ({
                 itemId: null,
                 itemName: i.name,
                 price: parseFloat(i.price || 0),
                 quantity: parseInt(i.quantity || 1),
                 specialInstructions: '',
                 itemCategory: 'online',
                 spiceLevel: null
             }));
        } else if (platform === 'swiggy' && rawOrder.cart?.items) {
             // Swiggy specific check
             orderItems = rawOrder.cart.items.map(i => ({
                 itemId: null,
                 itemName: i.name,
                 price: parseFloat(i.total || 0) / (i.quantity || 1),
                 quantity: parseInt(i.quantity || 1),
                 specialInstructions: '',
                 itemCategory: 'online',
                 spiceLevel: null
             }));
        }

const socketService = require('./socket.service'); // Added import

        if (orderItems.length > 0) {
            try {
                 await OrderModel.createOrderItems(newOrder.order_id, orderItems);
                 console.log(`[OnlineOrderService] Created ${orderItems.length} items for order #${newOrder.order_id}`);
            } catch (err) {
                 console.error(`[OnlineOrderService] Failed to create items for order #${newOrder.order_id}:`, err.message);
            }
        } else {
             console.warn(`[OnlineOrderService] No items found for ${platform} order #${externalId}. Raw Payload keys: ${Object.keys(rawOrder)}`);
        }

        // Fetch complete order with items for socket emit
        const completeOrder = await OrderModel.findById(newOrder.order_id);
        if (completeOrder) {
            socketService.emitNewOrder(completeOrder);
            console.log(`[OnlineOrderService] Emitted socket event for new order #${newOrder.order_id}`);
        }

        console.log(`[OnlineOrderService] Created local order ${newOrder.order_id} for ${platform} #${externalId}`);
    }

    /* ================= ACTIONS ================= */

    static async acceptOrder(internalOrderId, timeStr = "30") {
        const order = await OrderModel.findById(internalOrderId);
        if (!order) throw new Error('Order not found');

        // Queue Action for Polling Client (Reverse Polling Strategy)
        // 1 = Accept Needed
        await db.query(`UPDATE orders SET dyno_pending_action = 1 WHERE order_id = $1`, [internalOrderId]);

        // Try Direct API as well (Hybrid Approach)
        // If this fails, the Client Exe will still pick up the flag '1' and execute it.
        try {
            if (order.external_platform === 'zomato') {
                await DynoService.acceptZomatoOrder(order.external_order_id, timeStr);
            } else if (order.external_platform === 'swiggy') {
                await DynoService.acceptSwiggyOrder(order.external_order_id, parseInt(timeStr) || 30);
            }
        } catch (apiErr) {
            console.warn(`[OnlineOrderService] Direct Accept API failed (Polling will handle it): ${apiErr.message}`);
        }
        
        // We update status to 'confirmed' immediately for UI responsiveness
        // The webhook confirmation will just re-affirm it later.
        await OrderModel.updateStatus(internalOrderId, 'confirmed');
    }

    static async markOrderReady(internalOrderId) {
        const order = await OrderModel.findById(internalOrderId);
        if (!order) throw new Error('Order not found');

        // Queue Action for Polling Client
        // 3 = Mark Ready Needed
        await db.query(`UPDATE orders SET dyno_pending_action = 3 WHERE order_id = $1`, [internalOrderId]);

        try {
            if (order.external_platform === 'zomato') {
                await DynoService.markZomatoReady(order.external_order_id);
            } else if (order.external_platform === 'swiggy') {
                await DynoService.markSwiggyReady(order.external_order_id);
            }
        } catch (apiErr) {
            console.warn(`[OnlineOrderService] Direct MarkReady API failed (Polling will handle it): ${apiErr.message}`);
        }

        await OrderModel.updateStatus(internalOrderId, 'ready'); 
    }

    static async rejectOrder(internalOrderId, reason = 'Busy') {
        const order = await OrderModel.findById(internalOrderId);
        if (!order) throw new Error('Order not found');
        
        // Queue Action?? Dyno docs didn't specify code for Reject Polling.
        // Usually Reject must be direct. Assuming Direct only for now unless discovered otherwise.
        // Docs showed: 1=Accept, 3=Ready. No code for Reject.
        
        const restaurant = await RestaurantModel.findById(order.restaurant_id);
        
        if (order.external_platform === 'zomato') {
            if (!restaurant.zomato_restaurant_id) throw new Error('Zomato Restaurant ID missing');
            await DynoService.rejectZomatoOrder(restaurant.zomato_restaurant_id, order.external_order_id);
        } else if (order.external_platform === 'swiggy') {
             console.log('[OnlineOrderService] Swiggy reject not supported on this version.');
        }

        await OrderModel.updateStatus(internalOrderId, 'cancelled'); 
    }
}

module.exports = OnlineOrderService;
