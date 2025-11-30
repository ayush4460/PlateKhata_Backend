const UserModel = require('../models/user.model');
const Encryption = require('../utils/encryption');
const JWTUtils = require('../utils/jwt');
const ApiError = require('../utils/apiError');

class AuthService {
  /**
   * Register new user
   */
  static async register(userData) {
    const { username, email, password, fullName, role } = userData;

    // Check if user exists
    const existingUser = await UserModel.findByEmail(email);
    if (existingUser) {
      throw ApiError.conflict('Email already registered');
    }

    const existingUsername = await UserModel.findByUsername(username);
    if (existingUsername) {
      throw ApiError.conflict('Username already taken');
    }

    // Hash password
    const passwordHash = await Encryption.hashPassword(password);

    // Create user
    const user = await UserModel.create({
      username,
      email,
      passwordHash,
      fullName,
      role,
    });

    // Generate tokens
    const tokens = JWTUtils.generateTokenPair({
      userId: user.user_id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        userId: user.user_id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
      ...tokens,
    };
  }

  /**
   * Login user
   */
  static async login(email, password) {
    const user = await UserModel.findByEmail(email);
    if (!user) {
      throw ApiError.unauthorized('Invalid credentials');
    }

    // Check if user is active
    if (!user.is_active) {
      throw ApiError.forbidden('Account is deactivated');
    }

    // Verify password
    const isPasswordValid = await Encryption.comparePassword(
      password,
      user.password_hash
    );
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid credentials');
    }

    // Generate tokens
    const tokens = JWTUtils.generateTokenPair({
      userId: user.user_id,
      email: user.email,
      role: user.role,
    });

    return {
      user: {
        userId: user.user_id,
        username: user.username,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
      },
      ...tokens,
    };
  }

  /**
   * Refresh access token
   */
  static async refreshToken(refreshToken) {
    try {
      const decoded = JWTUtils.verifyRefreshToken(refreshToken);

      // Generate new access token
      const accessToken = JWTUtils.generateAccessToken({
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role,
      });

      return { accessToken };
    } catch (error) {
      throw ApiError.unauthorized('Invalid refresh token');
    }
  }

  /**
   * Get current user profile
   */
  static async getProfile(userId) {
    const user = await UserModel.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    return {
      userId: user.user_id,
      username: user.username,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      isActive: user.is_active,
      createdAt: user.created_at,
    };
  }
}

module.exports = AuthService;