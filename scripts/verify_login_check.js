require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('../src/config/database');

async function verifyLogin() {
  const client = await db.pool.connect();
  try {
    const email = 'amitpatwa693@gmail.com';
    const password = 'Admin@123';

    console.log(`Verifying login for: ${email}`);
    
    const res = await client.query('SELECT user_id, email, password_hash FROM users WHERE email = $1', [email]);
    
    if (res.rows.length === 0) {
        console.log('User not found!');
        return;
    }

    const user = res.rows[0];
    const hash = user.password_hash;
    console.log(`Stored Hash: ${hash}`);

    const isMatch = await bcrypt.compare(password, hash);
    console.log(`Password '${password}' match result: ${isMatch}`);

    if (!isMatch) {
        console.log('Trying to re-hash the password to see what it should look like...');
        const newHash = await bcrypt.hash(password, 10);
        console.log(`New generated hash would be: ${newHash}`);
    }

  } catch (error) {
    console.error('Verification failed:', error);
  } finally {
    client.release();
    process.exit();
  }
}

verifyLogin();
