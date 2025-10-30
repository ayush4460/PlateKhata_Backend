/**
 * Wrapper for async route handlers to catch errors
 * @param {Function} fn - Async function
 * @returns {Function} Express middleware
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = catchAsync;