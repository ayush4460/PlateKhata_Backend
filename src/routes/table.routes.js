const express = require('express');
const router = express.Router();
const TableController = require('../controllers/table.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/rbac.middleware');
const { body, param } = require('express-validator');
const validate = require('../middlewares/validate.middleware');
const { ROLES } = require('../config/constants');

// Validators
const createTableValidator = [
  body('tableNumber')
    .trim()
    .notEmpty()
    .withMessage('Table number is required'),
  body('capacity')
    .isInt({ min: 1, max: 20 })
    .withMessage('Capacity must be between 1-20'),
  body('restaurantId')
    .optional()
    .isInt()
    .withMessage('Restaurant ID must be an integer'),
];

const updateTableValidator = [
  param('id').isInt().withMessage('Invalid table ID'),
  body('capacity')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Capacity must be between 1-20'),
  body('isAvailable')
    .optional()
    .isBoolean()
    .withMessage('isAvailable must be boolean'),
];

// Public routes
router.get('/available', TableController.getAvailableTables);

// Admin only routes
router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN),
  createTableValidator,
  validate,
  TableController.createTable
);

router.get(
  '/',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.WAITER, ROLES.KITCHEN),
  TableController.getAllTables
);

router.get(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.WAITER),
  TableController.getTableById
);

router.put(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  updateTableValidator,
  validate,
  TableController.updateTable
);

router.post(
  '/:id/clear',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.WAITER),
  TableController.clearTable
);

router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  TableController.deleteTable
);

router.post(
  '/move',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.WAITER),
  [
    body('sourceTableId').isInt().withMessage('Invalid source table ID'),
    body('targetTableId').isInt().withMessage('Invalid target table ID'),
  ],
  validate,
  TableController.moveTable
);

router.patch(
  '/:id/customer',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.WAITER),
  [
    body('customerName').optional().trim(),
    body('customerPhone').optional().trim(),
  ],
  validate,
  TableController.updateCustomerDetails
);

module.exports = router;