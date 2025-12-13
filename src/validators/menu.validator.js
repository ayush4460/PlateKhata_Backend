const { body, param } = require('express-validator');

exports.createMenuItemValidator = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2-100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),

  body('categoryId')
    .isInt()
    .withMessage('Valid Category ID is required'),

  body('price')
    .isFloat({ min: 0.01 })
    .withMessage('Price must be greater than 0'),

  body('isVegetarian')
    .optional()
    .isBoolean()
    .withMessage('isVegetarian must be boolean'),

  body('preparationTime')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Preparation time must be a positive integer'),
];

exports.updateMenuItemValidator = [
  param('id').isInt().withMessage('Invalid menu item ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2-100 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),

  body('categoryId')
    .optional()
    .isInt()
    .withMessage('Category ID must be an integer'),

  body('price')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Price must be greater than 0'),

  body('isAvailable')
    .optional()
    .isBoolean()
    .withMessage('isAvailable must be boolean'),

  body('isVegetarian')
    .optional()
    .isBoolean()
    .withMessage('isVegetarian must be boolean'),
];