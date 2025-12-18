require('dotenv').config();
const db = require('../src/config/database');

async function updateIds() {
    try {
        const zomatoIds = '20734881, 20730803, 20806853, 22102644, 22196905, 19767850, 19520792, 22264651, 20830934, 20734887';
        
        // Update Restaurant 5
        const query = `
            UPDATE restaurants 
            SET zomato_restaurant_id = $1
            WHERE restaurant_id = 5
            RETURNING name, zomato_restaurant_id;
        `;
        
        const res = await db.query(query, [zomatoIds]);
        console.log('Updated Restaurant:', res.rows[0]);
        process.exit(0);

    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}

updateIds();
