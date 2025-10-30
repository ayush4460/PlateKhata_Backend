// backend/src/routes/settings.routes.js
const express = require('express');
const router = express.Router();
const SettingsController = require('../controllers/settings.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/rbac.middleware');
const { body } = require('express-validator');
const validate = require('../middlewares/validate.middleware');
const { ROLES } = require('../config/constants');

// Validator for the tax rate update
const updateTaxValidator = [
  body('taxRate')
    .isFloat({ min: 0, max: 0.5 }) // Allow 0% to 50% tax
    .withMessage('Tax rate must be a number between 0 and 0.5 (e.g., 0.08 for 8%)'),
];

// Admin-only route to update the tax rate
router.patch(
  '/tax',
  authenticate,
  authorize(ROLES.ADMIN), // Only Admins can change the tax rate
  updateTaxValidator,
  validate,
  SettingsController.updateTaxRate
);

module.exports = router;