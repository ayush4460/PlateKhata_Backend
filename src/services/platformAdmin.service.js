const PlatformAdminModel = require('../models/platformAdmin.model');
const Encryption = require('../utils/encryption');
const JWTUtils = require('../utils/jwt');
const ApiError = require('../utils/apiError');
const RestaurantModel = require('../models/restaurant.model');
const AuthService = require('./auth.service'); // Re-use for creating restaurant admins

class PlatformAdminService {
  /**
   * Login Platform Admin
   */
  static async login(email, password) {
    const admin = await PlatformAdminModel.findByEmail(email);
    if (!admin) {
      throw ApiError.unauthorized('Invalid credentials');
    }

    // Verify password
    const isPasswordValid = await Encryption.comparePassword(password, admin.password_hash);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid credentials');
    }

    // Generate tokens (Role: super_admin, RestaurantId: NULL)
    const tokens = JWTUtils.generateTokenPair({
      userId: admin.admin_id, // We map admin_id to userId in token for consistency
      email: admin.email,
      role: 'super_admin', 
      restaurantId: null,
      isPlatformAdmin: true // Explicit flag
    });

    return {
      user: {
        id: admin.admin_id,
        username: admin.username,
        email: admin.email,
        fullName: admin.full_name,
        role: 'super_admin'
      },
      ...tokens,
    };
  }

  // --- Restaurant Management ---

  static async createRestaurant(data) {
     return await RestaurantModel.create(data);
  }

  static async getAllRestaurants() {
      return await RestaurantModel.findAll();
  }

  static async updateRestaurant(id, data) {
      return await RestaurantModel.update(id, data);
  }

  // --- Staff Management ---

  static async registerRestaurantAdmin(userData) {
      // Logic to create a User (Restaurant Admin OR Kitchen Staff) linked to a restaurant
      // We delegate to AuthService since it handles User table
      return await AuthService.register({
          ...userData,
          role: userData.role || 'admin' // specific role or default to admin
      });
  }
}

module.exports = PlatformAdminService;
