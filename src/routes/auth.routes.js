const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const {
  registerValidator,
  loginValidator,
} = require('../validators/auth.validator');
const { authLimiter } = require('../middlewares/rateLimiter.middleware');

// Public routes
router.post(
  '/register',
  authLimiter,
  registerValidator,
  validate,
  AuthController.register
);

router.post(
  '/login',
  authLimiter,
  loginValidator,
  validate,
  AuthController.login
);

router.post('/refresh', AuthController.refreshToken);

// Protected routes
router.get('/profile', authenticate, AuthController.getProfile);
router.post('/logout', authenticate, AuthController.logout);

module.exports = router;