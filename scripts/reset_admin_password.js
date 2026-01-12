require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/config/database');

async function resetPassword() {
  const client = await db.pool.connect();
  try {
    const email = 'amitpatwa693@gmail.com';
    const newPassword = 'Admin@123';

    console.log(`Resetting password for: ${email}`);

    // Generate new hash
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);
    
    console.log('Generated new hash:', newHash);

    // Update DB
    const updateQuery = `
      UPDATE users 
      SET password_hash = $1, updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
      WHERE email = $2
      RETURNING user_id, email
    `;

    const result = await client.query(updateQuery, [newHash, email]);
    
    if (result.rows.length === 1) {
        console.log('Password reset successfully.');
    } else {
        console.log('User not found or update failed.');
    }

  } catch (error) {
    console.error('Reset failed:', error);
  } finally {
    client.release();
    process.exit();
  }
}

resetPassword();
