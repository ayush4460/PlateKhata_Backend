require('dotenv').config();
const db = require('../src/config/database');

async function debugUserHash() {
  const client = await db.pool.connect();
  try {
    console.log('Inspecting user hash...');

    const res = await client.query('SELECT user_id, email, password_hash FROM users WHERE email = $1', ['amitpatwa693@gmail.com']);
    
    if (res.rows.length === 0) {
        console.log('User not found!');
    } else {
        const user = res.rows[0];
        console.log('User found:', user.email);
        console.log('Hash length:', user.password_hash.length);
        console.log('Hash content (JSON stringified):', JSON.stringify(user.password_hash));
        
        // Check for newline manually
        if (user.password_hash.endsWith('\n')) {
            console.log('Confirmed: Hash ends with newline character.');
        } else {
            console.log('Hash does NOT end with newline character.');
        }
    }

  } catch (error) {
    console.error('Debug failed:', error);
  } finally {
    client.release();
    process.exit();
  }
}

debugUserHash();
