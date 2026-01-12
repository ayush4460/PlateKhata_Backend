require('dotenv').config();
const db = require('../src/config/database');

async function fixPasswordHashes() {
  const client = await db.pool.connect();
  try {
    console.log('Starting password hash fix...');

    await client.query('BEGIN');

    // Find users with whitespace in password_hash
    const checkQuery = `
      SELECT user_id, email, password_hash 
      FROM users 
      WHERE password_hash ~ '\\s+$'
    `;
    
    const usersToFix = await client.query(checkQuery);
    console.log(`Found ${usersToFix.rows.length} users with whitespace in password hash.`);

    if (usersToFix.rows.length === 0) {
      console.log('No users need fixing.');
      await client.query('COMMIT');
      return;
    }

    // Fix them
    const updateQuery = `
      UPDATE users 
      SET password_hash = TRIM(password_hash)
      WHERE password_hash ~ '\\s+$'
      RETURNING user_id, email
    `;

    const result = await client.query(updateQuery);
    console.log(`Fixed ${result.rows.length} users.`);
    result.rows.forEach(row => {
        console.log(` - Fixed user: ${row.email} (ID: ${row.user_id})`);
    });

    await client.query('COMMIT');
    console.log('Password hash fix completed successfully.');

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
  } finally {
    client.release();
    process.exit();
  }
}

fixPasswordHashes();
