// backend/src/validators/order.validator.js
const { body, param } = require('express-validator');

exports.createOrderValidator = [
  body('tableId')
    .isInt({ min: 1 })
    .withMessage('Valid table ID is required'),

  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item is required'),

  body('items.*.itemId')
    .isInt({ min: 1 })
    .withMessage('Valid item ID is required'),

  body('items.*.quantity')
    .isInt({ min: 1, max: 50 })
    .withMessage('Quantity must be between 1-50'),

  body('items.*.specialInstructions')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Special instructions must not exceed 200 characters'),

  body('customerName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Customer name must be between 2-100 characters'),

  body('customerPhone')
    .optional()
    .custom((value) => {
      // Allow dummy number "0000000000" or empty string
      if (value === '0000000000' || value === '') return true; 
      // Strict check for real numbers
      if (!/^[6-9]\d{9}$/.test(value)) {
        throw new Error('Invalid phone number');
      }
      return true;
    }),

  body('restaurantId')
    .optional()
    .isInt()
    .withMessage('Valid Restaurant ID is required'),

// --- COMMENTED OUT FOR FUTURE USE ---
  /*
  body('customerEmail')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  */


  body('specialInstructions')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Special instructions must not exceed 500 characters'),
];

exports.updateOrderStatusValidator = [
  param('id').isInt().withMessage('Invalid order ID'),
  body('status')
    .isIn(['pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled'])
    .withMessage('Invalid order status'),
];

exports.updatePaymentStatusValidator = [
  param('id').isInt().withMessage('Invalid order ID'),
  body('paymentStatus')
    .isIn(['Pending', 'Requested', 'Approved', 'Failed', 'Refunded'])
    .withMessage('Invalid payment status'),
  body('paymentMethod')
    .optional()
    .isIn(['Cash', 'UPI', 'Card', 'Other'])
    .withMessage('Invalid payment method'),
];