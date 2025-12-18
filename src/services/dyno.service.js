// backend/src/services/dyno.service.js
const axios = require('axios');
const ApiError = require('../utils/apiError');

class DynoService {
  constructor() {
    this.baseUrl = process.env.DYNO_BASE_URL;
    this.accessToken = process.env.DYNO_ACCESS_TOKEN;
    this.orderId = process.env.DYNO_ORDER_ID; // Not sure if needed for fetching, but kept for ref
    
    if (!this.baseUrl || !this.accessToken) {
      console.warn('[DynoService] Missing configuration. DYNO_BASE_URL or DYNO_ACCESS_TOKEN not set.');
    }

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000 
    });
  }

  /**
   * Fetch orders from Dyno API
   * @param {string} restaurantExternalIds - Optional comma-separated list of restaurant IDs
   * @param {string} status - Optional status filter
   */
  async fetchOrders(restaurantExternalIds = null, status = 'active') {
    try {
      const params = {};
      if (restaurantExternalIds) params.restaurant_ids = restaurantExternalIds;
      if (status) params.status = status;

      // Ensure we hit the correct endpoint. Assuming /orders based on typical REST patterns
      const [zomatoRes, swiggyRes] = await Promise.allSettled([
        this.client.get('/api/v1/zomato/orders/current'),
        this.client.get('/api/v1/swiggy/orders')
      ]);

      let allOrders = [];

      // Process Zomato
      if (zomatoRes.status === 'fulfilled' && zomatoRes.value.data) {
        const zData = zomatoRes.value.data;
        let zOrders = [];

        // Helper to extract entities with bucket status
        const extractEntities = (item, bucketKey) => {
            if (item && item.entities && Array.isArray(item.entities)) {
                 item.entities.forEach(summary => {
                      summary.zomatoBucketStatus = bucketKey; // Attach bucket (e.g., 'preparing_orders')
                      zOrders.push(summary);
                 });
            } else if (item && typeof item === 'object' && !item.entities) {
                 // Nested case handling if needed
            }
        };

        if (Array.isArray(zData)) {
            zData.forEach(bucket => {
                 // Each bucket is { new_orders: ... }
                 Object.entries(bucket).forEach(([key, val]) => extractEntities(val, key));
            });
        } else if (typeof zData === 'object') {
             // It's a single object { new_orders: ..., preparing_orders: ... }
             Object.entries(zData).forEach(([key, val]) => extractEntities(val, key));
        }

        // Check if extracted items are summaries (just tab_id) or full orders
        if (zOrders.length > 0) {
            console.log(`[DynoService] Found ${zOrders.length} Zomato summaries. Fetching details...`);
            const detailPromises = zOrders.map(async (summary) => {
                const orderId = summary.order_id || summary.tab_id;
                if (!orderId) return null;
                try {
                    const detailed = await this.getZomatoOrderDetails(orderId);
                    // Pass bucket status through
                    if (detailed) detailed.bucketStatus = summary.zomatoBucketStatus;
                    return detailed;
                } catch (err) {
                    console.error(`[DynoService] Failed to get details for Zomato order ${orderId}:`, err.message);
                    return null;
                }
            });
            
            const details = await Promise.all(detailPromises);
            const enrichedOrders = details.filter(o => o !== null);
            console.log(`[DynoService] Successfully fetched details for ${enrichedOrders.length} Zomato orders.`);
            allOrders = allOrders.concat(enrichedOrders.map(o => ({ ...o, platform: 'zomato' })));
        } else {
             console.log('[DynoService] No Zomato orders found in buckets.');
        }
      } else {
        console.warn('[DynoService] Zomato fetch failed:', zomatoRes.reason?.message || 'Unknown error');
      }

      // Process Swiggy
      if (swiggyRes.status === 'fulfilled' && swiggyRes.value.data) {
        // Assuming data is an array or has an 'orders' property
        const orders = Array.isArray(swiggyRes.value.data) ? swiggyRes.value.data : (swiggyRes.value.data.orders || []);
        allOrders = allOrders.concat(orders.map(o => ({ ...o, platform: 'swiggy' })));
      }

      console.log(`[DynoService] Fetched ${allOrders.length} combined orders.`);
      return allOrders;
    } catch (error) {
      console.error('[DynoService] Fetch Orders Failed:', error.message);
      return []; 
    }
  }

  async getZomatoOrderDetails(orderId) {
    try {
        const response = await this.client.get('/api/v1/zomato/order/details', {
            params: { order_id: orderId }
        });
        return response.data;
    } catch (error) {
        throw new Error(`Zomato Details Failed: ${error.message}`);
    }
  }

  /* ================= ZOMATO ACTIONS ================= */

  async acceptZomatoOrder(orderId, deliveryTime = "30") {
    try {
      // POST /api/v1/zomato/orders/accept_order?order_id=...&delivery_time=...
      const response = await this.client.post('/api/v1/zomato/orders/accept_order', null, { 
        params: { order_id: orderId, delivery_time: deliveryTime } 
      });
      return response.data;
    } catch (error) {
       throw new Error(`Zomato Accept Failed: ${error.message}`);
    }
  }

  async markZomatoReady(orderId) {
    try {
      // POST /api/v1/zomato/orders/mark_ready?order_id=...
      const response = await this.client.post('/api/v1/zomato/orders/mark_ready', null, {
        params: { order_id: orderId }
      });
      return response.data;
    } catch (error) {
       throw new Error(`Zomato Mark Ready Failed: ${error.message}`);
    }
  }

  async rejectZomatoOrder(restaurantId, orderId) { // Zomato reject needs restaurant_id? Checking docs... Yes: restaurant_id, order_id
     try {
       // POST /api/v1/zomato/orders/reject?restaurant_id=..&order_id=..
       const response = await this.client.post('/api/v1/zomato/orders/reject', null, {
         params: { restaurant_id: restaurantId, order_id: orderId }
       });
       return response.data;
     } catch (error) {
        throw new Error(`Zomato Reject Failed: ${error.message}`);
     }
  }

  /* --- Stock Management --- */

  async markItemInStock(itemId, restaurantId) {
      // POST /api/v1/zomato/items/in_stock or /in_stock/{res_id}
      const p = restaurantId ? `/api/v1/zomato/items/in_stock/${restaurantId}` : '/api/v1/zomato/items/in_stock';
      return (await this.client.post(p, null, { params: { item_id: itemId } })).data;
  }

  async markItemOutOfStock(itemId, restaurantId) {
       // POST /api/v1/zomato/items/out_of_stock or /out_of_stock/{res_id}
      const p = restaurantId ? `/api/v1/zomato/items/out_of_stock/${restaurantId}` : '/api/v1/zomato/items/out_of_stock';
      return (await this.client.post(p, null, { params: { item_id: itemId } })).data;
  }

  async closeOutlet(date, month, year, hour, min, sec, restaurantId) {
      // POST /api/v1/zomato/close_outlet
      const p = restaurantId ? `/api/v1/zomato/close_outlet/${restaurantId}` : '/api/v1/zomato/close_outlet';
      const params = { date, month, year, hour, min, sec };
      return (await this.client.post(p, null, { params })).data;
  }

  /* ================= SWIGGY ACTIONS ================= */

  async acceptSwiggyOrder(orderId, prepTime = 30) {
    try {
      // POST /api/v1/swiggy/orders/accept?order_id=...&prep_time=...
      const response = await this.client.post('/api/v1/swiggy/orders/accept', null, {
        params: { order_id: orderId, prep_time: prepTime }
      });
      return response.data;
    } catch (error) {
       throw new Error(`Swiggy Accept Failed: ${error.message}`);
    }
  }

  async markSwiggyReady(orderId) {
    try {
      // POST /api/v1/swiggy/orders/ready?order_id=...
      const response = await this.client.post('/api/v1/swiggy/orders/ready', null, {
        params: { order_id: orderId }
      });
      return response.data;
    } catch (error) {
       throw new Error(`Swiggy Mark Ready Failed: ${error.message}`);
    }
  }
  
  // Note: Swiggy reject not explicitly in the short list of paths I saw, wait.. 
  // Docs say: /api/v1/swiggy/orders/cancel (Cancel Order Of Restaurant), maybe that's reject?
  // Let's assume strict actions for now.
  async getZomatoOrderHistory(restaurantId) {
      try {
          const response = await this.client.get('/api/v1/zomato/orderHistory', {
              params: { restaurant_id: restaurantId }
          });
          
          const rawData = response.data;
          const pages = rawData.pages || [];
          const orderIds = pages.map(p => p.orders || []).flat();

          if (orderIds.length === 0) {
              return [];
          }

          console.log(`[DynoService] History has ${orderIds.length} IDs. Fetching details...`);
          
          const detailPromises = orderIds.map(async (id) => {
              try {
                  return await this.getZomatoOrderDetails(id);
              } catch (e) {
                  console.warn(`[DynoService] Failed history detail for ${id}:`, e.message);
                  return null;
              }
          });

          const results = await Promise.all(detailPromises);
          
          // Normalize and Filter
          return results
              .filter(r => r && r.status === 'success' && r.order)
              .map(r => {
                  const o = r.order;
                  // Map to flat structure for Frontend
                  return {
                      id: o.id,
                      order_id: o.id, // Frontend uses both/either
                      order_time: o.createdAt,
                      status: o.state, // e.g., 'DELIVERED', 'CANCELLED'
                      // User requested displayCost
                      total_amount: o.cartDetails?.total?.amountDetails?.displayCost || o.cartDetails?.total?.amountDetails?.amountTotalCost || 0,
                      customer_name: o.creator?.name || 'Guest',
                      payment_method: o.paymentMethod,
                      items: (o.cartDetails?.items?.dishes || []).map(d => ({
                          name: d.name,
                          quantity: d.quantity
                      }))
                  };
              });

      } catch (error) {
          console.error(`[DynoService] Failed to fetch history for ${restaurantId}: ${error.message}`);
          throw new Error(`History Fetch Failed: ${error.message}`);
      }
  }
}

module.exports = new DynoService();
