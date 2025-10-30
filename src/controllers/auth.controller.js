const AuthService = require('../services/auth.service');
const ApiResponse = require('../utils/apiResponse');
const catchAsync = require('../utils/catchAsync');

class AuthController {
  /**
   * Register new user
   * POST /api/v1/auth/register
   */
  static register = catchAsync(async (req, res) => {
    const result = await AuthService.register(req.body);
    return ApiResponse.created(res, result, 'User registered successfully');
  });

  /**
   * Login user
   * POST /api/v1/auth/login
   */
  static login = catchAsync(async (req, res) => {
    const { email, password } = req.body;
    const result = await AuthService.login(email, password);
    return ApiResponse.success(res, result, 'Login successful');
  });

  /**
   * Refresh access token
   * POST /api/v1/auth/refresh
   */
  static refreshToken = catchAsync(async (req, res) => {
    const { refreshToken } = req.body;
    const result = await AuthService.refreshToken(refreshToken);
    return ApiResponse.success(res, result, 'Token refreshed successfully');
  });

  /**
   * Get current user profile
   * GET /api/v1/auth/profile
   */
  static getProfile = catchAsync(async (req, res) => {
    const result = await AuthService.getProfile(req.user.userId);
    return ApiResponse.success(res, result);
  });

  /**
   * Logout (client-side token removal)
   * POST /api/v1/auth/logout
   */
  static logout = catchAsync(async (req, res) => {
    return ApiResponse.success(res, null, 'Logged out successfully');
  });
}

module.exports = AuthController;