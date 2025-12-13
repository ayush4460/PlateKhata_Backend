// Setup file for Jest
// You can add global setup here, e.g., mocking DB connections if needed for unit tests
jest.setTimeout(30000); // 30s timeout

const { pool } = require('../src/config/database');

afterAll(async () => {
  if (pool) {
    await pool.end();
  }
});
