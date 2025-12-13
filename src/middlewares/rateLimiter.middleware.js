const rateLimit = require('express-rate-limit');

/**
 * General API rate limiter
 */
exports.apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 1000,
  message: {
    success: false,
    message: 'Too many requests, please try again later',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Strict rate limiter for auth routes
 */
exports.authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // Relaxed for dev
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 1 minute',
  },
  skipSuccessfulRequests: true,
});

/**
 * Lenient rate limiter for public routes
 */
exports.publicLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 2000,
  message: {
    success: false,
    message: 'Too many requests from this IP',
  },
});