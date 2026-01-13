const express = require('express');
const router = express.Router();

// Import route modules
const authRoutes = require('./auth.routes');
const menuRoutes = require('./menu.routes');
const categoryRoutes = require('./category.routes');
const orderRoutes = require('./order.routes');
const tableRoutes = require('./table.routes');
const settingsRoutes = require('./settings.routes');
const uploadRoutes = require('./upload.routes');
const onlineOrderRoutes = require('./online-order.routes');
const dynoWebhookRoutes = require('./dyno-webhook.routes');
const emailRoutes = require('./email.routes');

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
      categories: `/api/${process.env.API_VERSION}/categories`, // Added
      orders: `/api/${process.env.API_VERSION}/orders`,
      tables: `/api/${process.env.API_VERSION}/tables`,
    },
  });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/tables', tableRoutes);
router.use('/categories', categoryRoutes);
router.use('/menu', menuRoutes);
router.use('/orders', orderRoutes); // Local Orders
router.use('/online-orders', onlineOrderRoutes); // Online Orders (Manual Actions)
router.use('/dyno', dynoWebhookRoutes); // Webhook Endpoints (Push/Poll)
router.use('/uploads', uploadRoutes);
router.use('/settings', settingsRoutes);
router.use('/email', emailRoutes);
router.use('/customizations', require('./customization.routes'));
router.use('/public', require('./public.routes'));

module.exports = router;