const request = require('supertest');
const express = require('express');
const routes = require('../../src/routes');

// Setup express app for testing routes
const app = express();
app.use(express.json());
app.use('/api/v1', routes);

describe('Health Check Integration', () => {
  test('GET /api/v1/ should return 200 and version info', async () => {
    const res = await request(app).get('/api/v1/');
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Restaurant QR Ordering API');
    expect(res.body.version).toBeDefined();
  });
});
