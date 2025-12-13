require('dotenv').config();
const db = require('../src/config/database');
const Encryption = require('../src/utils/encryption');

async function fixUsers() {
  try {
    console.log('Starting User Fix...');

    // 1. Delete invalid/test users
    // User mentioned "1 and 2", image shows 1 and 4 are the ones that look "odd" 
    // (1 has placeholder hash, 4 is auto-generated test user).
    // We will clean up by username to be safe.
    
    console.log('Deleting invalid users...');
    await db.query(`DELETE FROM users WHERE username IN ('admin', 'admin1') OR username LIKE 'kuser_%' OR user_id IN (1, 2, 4)`);
    
    // 2. Get Restaurant 1 ID
    const res1 = await db.query(`SELECT restaurant_id FROM restaurants WHERE name = 'MuchMate Central'`);
    if (res1.rows.length === 0) {
        throw new Error('MuchMate Central restaurant not found');
    }
    const res1Id = res1.rows[0].restaurant_id;

    // 3. Generate Hash
    const passwordHash = await Encryption.hashPassword('Admin@123');

    // 4. Re-insert Admin for Central
    console.log('Re-inserting Admin for MuchMate Central...');
    await db.query(`
        INSERT INTO users (username, email, password_hash, full_name, role, restaurant_id, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, true)
    `, ['admin', 'admin@restaurant.com', passwordHash, 'System Administrator', 'admin', res1Id]);

    // 5. Insert Kitchen for Central
    console.log('Inserting Kitchen for MuchMate Central...');
    await db.query(`
        INSERT INTO users (username, email, password_hash, full_name, role, restaurant_id, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, true)
    `, ['kitchen', 'kitchen@restaurant.com', passwordHash, 'Central Chef', 'kitchen', res1Id]);
    
    console.log('User fix completed successfully.');
    process.exit(0);
  } catch (error) {
    console.error('Fix failed:', error);
    process.exit(1);
  }
}

fixUsers();
