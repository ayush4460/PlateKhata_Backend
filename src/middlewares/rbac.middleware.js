const ApiError = require('../utils/apiError');
const { ROLES } = require('../config/constants');

/**
 * Role-based access control middleware
 * @param {...string} allowedRoles - Roles allowed to access the route
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized('Authentication required');
    }

    if (!allowedRoles.includes(req.user.role)) {
      console.log(`[RBAC ERROR] User Role: ${req.user.role}, Allowed: ${allowedRoles}, UserID: ${req.user.userId}`);
      throw ApiError.forbidden('Insufficient permissions');
    }

    next();
  };
};

module.exports = authorize;