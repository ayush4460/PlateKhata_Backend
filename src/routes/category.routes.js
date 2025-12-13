const express = require('express');
const router = express.Router();
const CategoryController = require('../controllers/category.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/rbac.middleware');
const { ROLES } = require('../config/constants');
// const validate = require('../middlewares/validate.middleware'); // Add if validators are created later

// Public/Shared routes (Filtered by restaurantId in controller)
router.get('/', CategoryController.getAll);

// Admin only routes
router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN),
  // validate, // Add validation middleware here if needed
  CategoryController.create
);

router.put(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  CategoryController.update
);

router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  CategoryController.delete
);

module.exports = router;
