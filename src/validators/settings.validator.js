// backend/src/validators/settings.validator.js
const { body } = require('express-validator');

exports.updateSettingsValidator = [
    body('taxRate')
        .optional()
        .isFloat({ min: 0, max: 0.5 })
        .withMessage('Tax rate must be between 0 and 0.5'),

    body('discountRate')
        .optional()
        .isFloat({ min: 0, max: 1.0 })
        .withMessage('Discount rate must be between 0 and 1.0'),
];