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

    const userRole = req.user.role ? req.user.role.toLowerCase() : '';
    const normalizedAllowed = allowedRoles.map(r => r.toLowerCase());

    if (!normalizedAllowed.includes(userRole)) {
      console.log(`[RBAC ERROR] User Role: ${req.user.role}, Allowed: ${allowedRoles}, UserID: ${req.user.userId}`);
      throw ApiError.forbidden('Insufficient permissions');
    }

    next();
  };
};

module.exports = authorize;