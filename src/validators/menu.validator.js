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

  body('category')
    .isIn(['Beverages', 'Starters', 'Main Course', 'Desserts', 'Breads', 'Specials','Salads','Soups','Appetizers'])
    .withMessage('Invalid category'),

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

  body('category')
    .optional()
    .isIn(['Beverages', 'Starters', 'Main Course', 'Desserts', 'Breads', 'Specials'])
    .withMessage('Invalid category'),

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