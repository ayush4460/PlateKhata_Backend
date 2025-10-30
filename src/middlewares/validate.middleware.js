const { validationResult } = require('express-validator');
const ApiResponse = require('../utils/apiResponse');

/**
 * Validation middleware to check for validation errors
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map((err) => ({
      field: err.path,
      message: err.msg,
    }));

    return ApiResponse.badRequest(
      res,
      'Validation failed',
      formattedErrors
    );
  }

  next();
};

module.exports = validate;