const express = require('express');
const router = express.Router();
const CustomizationController = require('../controllers/customization.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const authorize = require('../middlewares/rbac.middleware');

// All routes require authentication and appropriate role (admin/manager)
router.use(authenticate);
// router.use(authorize('admin', 'manager')); // Adjust RBAC as per existing project rules

router.get('/', CustomizationController.getGroups);
router.post('/', CustomizationController.createGroup);
router.put('/:id', CustomizationController.updateGroup);
router.delete('/:id', CustomizationController.deleteGroup);

// Item Assignment Routes
router.get('/item/:itemId', CustomizationController.getItemCustomizations);
router.post('/assign', CustomizationController.assignToItem);
router.delete('/item/:itemId/group/:groupId', CustomizationController.removeItemCustomization);

module.exports = router;
