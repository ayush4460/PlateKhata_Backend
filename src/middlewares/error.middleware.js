const ApiError = require('../utils/apiError');
const ApiResponse = require('../utils/apiResponse');

/**
 * Global error handler middleware
 */
const errorMiddleware = (err, req, res, next) => {
  let { statusCode, message } = err;

  // Handle operational errors
  if (err instanceof ApiError && err.isOperational) {
    return ApiResponse.error(res, message, statusCode);
  }

  // Handle specific errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation Error';
  }

  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  if (err.code === '23505') {
    // PostgreSQL unique violation
    statusCode = 409;
    message = 'Duplicate entry';
  }

  if (err.code === '23503') {
    // PostgreSQL foreign key violation
    statusCode = 400;
    message = 'Referenced record does not exist';
  }

  // Log error in development
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', err);
  }

  // Send error response
  return res.status(statusCode || 500).json({
    success: false,
    message: message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    timestamp: new Date().toISOString(),
  });
};

module.exports = errorMiddleware;