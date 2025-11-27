// backend/src/routes/settings.routes.js
const express = require('express');
const router = express.Router();
const SettingsController = require('../controllers/settings.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const { updateSettingsValidator } = require('../validators/settings.validator');
const { ROLES } = require('../config/constants');

// Update settings (Tax, Discount)
router.patch(
  '/',
  authenticate,
  authorize(ROLES.ADMIN),
  updateSettingsValidator,
  validate,
  SettingsController.updateSettings
);

module.exports = router;