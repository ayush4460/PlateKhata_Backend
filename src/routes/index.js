const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const menuRoutes = require('./menu.routes');
const orderRoutes = require('./order.routes');
const tableRoutes = require('./table.routes');
const settingsRoutes = require('./settings.routes');
const uploadRoutes = require('./upload.routes');

// Health check
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Restaurant QR Ordering API',
    version: process.env.API_VERSION || 'v1',
    timestamp: new Date().toISOString(),
    endpoints: {
      auth: `/api/${process.env.API_VERSION}/auth`,
      menu: `/api/${process.env.API_VERSION}/menu`,
      orders: `/api/${process.env.API_VERSION}/orders`,
      tables: `/api/${process.env.API_VERSION}/tables`,
    },
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/menu', menuRoutes);
router.use('/orders', orderRoutes);
router.use('/tables', tableRoutes);
router.use('/settings', settingsRoutes);
router.use('/uploads', uploadRoutes);

module.exports = router;