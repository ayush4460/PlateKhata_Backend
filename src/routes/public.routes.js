const express = require('express');
const PublicController = require('../controllers/public.controller');
const router = express.Router();

// Public routes (no auth required)
// Public routes (no auth required)
router.get('/restaurants', PublicController.getAllActiveRestaurants);
router.get('/restaurants/:slug', PublicController.getRestaurantBySlug);
router.get('/restaurants/:slug/menu', PublicController.getMenuBySlug);
router.get('/tables/verify', PublicController.verifyTableToken);
router.post('/book-demo', PublicController.bookDemo);

module.exports = router;
