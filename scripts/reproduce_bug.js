require('dotenv').config();
const OrderService = require('../src/services/order.service'); 
const db = require('../src/config/database');
const MenuModel = require('../src/models/menu.model');
const TableModel = require('../src/models/table.model');

async function run() {
    try {
        console.log('Connecting to DB...');
        // Mock DB connection if needed or just use require
        // assuming env vars are set or default

        // 1. Find a valid Table and Menu Item
        const tables = await db.query('SELECT * FROM tables WHERE is_available = true LIMIT 1');
        if (tables.rows.length === 0) throw new Error('No available tables');
        const table = tables.rows[0];
        console.log(`Using Table: ${table.table_id}`);

        const items = await db.query('SELECT * FROM menu_items WHERE price > 0 LIMIT 1');
        if (items.rows.length === 0) throw new Error('No menu items');
        const item = items.rows[0];
        console.log(`Using Item: ${item.name} (ID: ${item.item_id}, Price: ${item.price})`);

        // 2. Create Payload with Quantity 2
        const qty = 2;
        const expectedTotal = parseFloat(item.price) * qty;
        
        const payload = {
            tableId: table.table_id,
            restaurantId: table.restaurant_id, // Ensure matches
            items: [
                {
                    itemId: item.item_id,
                    quantity: qty, // NUMBER 2
                    specialInstructions: "Debug Test"
                }
            ],
            customerName: "DebugBot",
            customerPhone: "9999999999"
        };

        console.log('Creating Order with payload:', JSON.stringify(payload, null, 2));

        // 3. Call Service
        const result = await OrderService.createOrder(payload);
        const order = result.order;
        console.log(`Order Created! ID: ${order.order_id}`);
        console.log(`Order Total: ${order.total_amount}`);
        console.log(`Expected Total: ${expectedTotal}`);

        if (parseFloat(order.total_amount) !== expectedTotal) {
            console.error('MISMATCH IN TOTAL AMOUNT!');
        }

        // 4. Verify Order Items in DB
        const savedItems = await db.query('SELECT * FROM order_items WHERE order_id = $1', [order.order_id]);
        console.log('Saved Items:', savedItems.rows);


        const savedQty = savedItems.rows[0].quantity;
        if (savedQty !== qty) {
            console.error(`BUG REPRODUCED: Requested Qty ${qty}, Saved Qty ${savedQty}`);
        } else {
            console.log('Result: Quantity Saved Correctly.');
        }

        // 5. Verify Fetch via Service (findAll)
        console.log('Fetching via findAll...');
        // We need session token to fetch? Or staff mode?
        // getAllOrders checks sessionToken OR includeAllForStaff.
        const fetchedOrders = await OrderService.getAllOrders({ 
            includeAllForStaff: true,
            restaurantId: table.restaurant_id,
            limit: 5 // limit to recent
        });

        const fetchedOrder = fetchedOrders.find(o => String(o.order_id) === String(order.order_id));
        if (!fetchedOrder) {
             console.error('Fetched order not found via API!');
        } else {
             const fetchedItem = fetchedOrder.items.find(i => String(i.item_id) === String(item.item_id));
             console.log(`Fetched Item Quantity from Service: ${fetchedItem ? fetchedItem.quantity : 'Not Found'}`);
             if (fetchedItem && fetchedItem.quantity !== qty) {
                 console.error(`BUG REPRODUCED in QUERY: Saved ${savedQty} but Fetched ${fetchedItem.quantity}`);
             } else {
                 console.log('Result: Quantity Fetched Correctly.');
             }
        }


    } catch (e) {
        console.error('Error:', e);
    } finally {
        // process.exit(0); // db pool might hang
    }
}

run();
