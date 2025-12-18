require('dotenv').config();
const db = require('../src/config/database');

async function debugState() {
    try {
        console.log('--- DEBUG STATE ---');
        
        // 1. Check Restaurants
        const res = await db.query('SELECT restaurant_id, zomato_restaurant_id FROM restaurants');
        console.log('Restaurants:', res.rows);

        // 2. Check Orders count
        const orders = await db.query("SELECT order_id, external_order_id, external_platform, restaurant_id FROM orders WHERE order_type = 'online'");
        console.log('Online Orders:', orders.rows);

        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

debugState();
