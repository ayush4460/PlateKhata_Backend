const express = require('express');
const router = express.Router();
const MenuController = require('../controllers/menu.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/rbac.middleware');
const validate = require('../middlewares/validate.middleware');
const upload = require('../middlewares/upload.middleware');
const {
  createMenuItemValidator,
  updateMenuItemValidator,
} = require('../validators/menu.validator');
const { ROLES } = require('../config/constants');

// Public routes
router.get('/', MenuController.getAllItems);
router.get('/categories', MenuController.getCategories);
router.get('/category/:category', MenuController.getItemsByCategory);
router.get('/:id', MenuController.getItemById);

// Admin only routes
router.post(
  '/',
  authenticate,
  authorize(ROLES.ADMIN),
  upload.single('image'),
  createMenuItemValidator,
  validate,
  MenuController.createItem
);

router.put(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  upload.single('image'),
  updateMenuItemValidator,
  validate,
  MenuController.updateItem
);

router.delete(
  '/:id',
  authenticate,
  authorize(ROLES.ADMIN),
  MenuController.deleteItem
);

router.patch(
  '/:id/availability',
  authenticate,
  authorize(ROLES.ADMIN, ROLES.KITCHEN),
  MenuController.toggleAvailability
);

module.exports = router;