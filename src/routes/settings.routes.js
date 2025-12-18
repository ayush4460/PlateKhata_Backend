// backend/src/routes/settings.routes.js
const express = require('express');
const router = express.Router();
const SettingsController = require('../controllers/settings.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const { updateSettingsValidator } = require('../validators/settings.validator');
const { ROLES } = require('../config/constants');

// Update settings (Tax, Discount, UpiId)
router.patch(
  '/',
  authenticate,
  authorize(ROLES.ADMIN),
  updateSettingsValidator,
  validate,
  SettingsController.updateSettings
);

// Use optionalAuth to populate req.user if token is present
const { optionalAuth } = require('../middlewares/auth.middleware');
router.get('/public', optionalAuth, SettingsController.getPublicSettings);

module.exports = router;