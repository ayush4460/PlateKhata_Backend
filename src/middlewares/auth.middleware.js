const JWTUtils = require('../utils/jwt');
const ApiError = require('../utils/apiError');
const catchAsync = require('../utils/catchAsync');

/**
 * Authenticate user via JWT
 */
exports.authenticate = catchAsync(async (req, res, next) => {
  // Get token from header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw ApiError.unauthorized('No token provided');
  }

  const token = authHeader.split(' ')[1];

  try {
    // Verify token
    const decoded = JWTUtils.verifyAccessToken(token);

    // Attach user info to request
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };

    next();
  } catch (error) {
    throw ApiError.unauthorized('Invalid or expired token');
  }
});

/**
 * Optional authentication (doesn't throw error if no token)/**
 */
exports.optionalAuth = catchAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];

    try {
      const decoded = JWTUtils.verifyAccessToken(token);
      req.user = {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      };
    } catch (error) {
      // Continue without authentication
      req.user = null;
    }
  }

  next();
});