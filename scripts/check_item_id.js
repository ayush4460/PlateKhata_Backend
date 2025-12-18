require('dotenv').config();
const db = require('../src/config/database');

async function checkSchema() {
    try {
        const query = `
            SELECT column_name, is_nullable, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'order_items' AND column_name = 'item_id';
        `;
        const res = await db.query(query);
        console.log(res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkSchema();
