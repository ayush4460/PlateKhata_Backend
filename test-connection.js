require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function testConnection() {
  try {
    const result = await pool.query('SELECT NOW(), version()');
    console.log('Connection successful!');
    console.log('Current time:', result.rows[0].now);
    console.log('PostgreSQL version:', result.rows[0].version);
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Connection failed!');
    console.error('Error:', error.message);
    console.error('\nPlease check:');
    console.error('1. PostgreSQL is running');
    console.error('2. Database exists');
    console.error('3. Password is correct in .env file');
    process.exit(1);
  }
}

testConnection();