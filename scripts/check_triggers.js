require('dotenv').config();
const db = require('../src/config/database');

async function checkTriggers() {
    try {
        const query = `
            SELECT trigger_name, event_manipulation, event_object_table, action_statement
            FROM information_schema.triggers
            WHERE event_object_table = 'orders';
        `;
        const res = await db.query(query);
        console.log('Triggers:', res.rows);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

checkTriggers();
