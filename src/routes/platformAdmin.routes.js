const express = require('express');
const PlatformAdminController = require('../controllers/platformAdmin.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/rbac.middleware');
const { ROLES } = require('../config/constants');

const router = express.Router();

// Public Routes
router.post('/login', PlatformAdminController.login);

// Protected Routes (Super Admin Only)
router.use(authenticate);
router.use(authorize(ROLES.SUPER_ADMIN));

router.get('/restaurants', PlatformAdminController.getAllRestaurants);
router.post('/restaurants', PlatformAdminController.createRestaurant);
router.patch('/restaurants/:id', PlatformAdminController.updateRestaurant);

// Register a new admin user for a specific restaurant
router.post('/restaurants/admin', PlatformAdminController.registerRestaurantAdmin);

module.exports = router;
