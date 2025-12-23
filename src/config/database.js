  const { Pool } = require('pg');

  let pool;

  if (process.env.DATABASE_URL) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : { rejectUnauthorized: false },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 30000,
    });
  } else {
    pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  pool.on('connect', () => {
    console.log('Database connected successfully');
  });

  pool.on('error', (err) => {
    console.error('Unexpected database error:', err);
    process.exit(-1);
  });

  module.exports = {
    query: (text, params) => pool.query(text, params),
    pool,
  };