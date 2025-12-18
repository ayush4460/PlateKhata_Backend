require('dotenv').config();
const db = require('../src/config/database');

async function checkSchema() {
    const res = await db.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'orders';
    `);
    console.log(res.rows);
    process.exit(0);
}
checkSchema();
