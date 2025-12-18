require('dotenv').config();
const db = require('../src/config/database');

async function checkPrice() {
    try {
        const res = await db.query("SELECT order_id, subtotal, tax_amount, total_amount, applied_tax_rate FROM orders WHERE external_order_id = '7593749165'");
        console.log('Order Data:', res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkPrice();
