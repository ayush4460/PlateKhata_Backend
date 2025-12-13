require('dotenv').config();
const db = require('../src/config/database');
const RestaurantModel = require('../src/models/restaurant.model');
const AuthService = require('../src/services/auth.service');
const UserModel = require('../src/models/user.model');

async function verifyLoginFlow() {
  try {
    console.log('Starting Login Flow Verification...');

    // 1. Create a Restaurant
    const restaurantData = {
      name: 'Test Kitchen ' + Date.now(),
      address: '123 Test St',
      contactEmail: `contact_${Date.now()}@test.com`,
      isActive: true
    };
    console.log('Creating restaurant:', restaurantData.name);
    const restaurant = await RestaurantModel.create(restaurantData);
    console.log('Restaurant created with ID:', restaurant.restaurant_id);

    // 2. Register a User for this Restaurant
    const uniqueId = Date.now();
    const userData = {
      username: `kuser_${uniqueId}`,
      email: `kitchen_${uniqueId}@test.com`,
      password: 'Password123!',
      fullName: 'Kitchen Staff',
      role: 'kitchen',
      restaurantId: restaurant.restaurant_id
    };
    console.log('Registering user:', userData.username);
    const registered = await AuthService.register(userData);
    console.log('User registered. Restaurant ID in response:', registered.user.restaurantId);

    if (registered.user.restaurantId !== restaurant.restaurant_id) {
      throw new Error('Mismatch in registered user restaurant ID');
    }

    // 3. Login
    console.log('Attempting login...');
    const loginResponse = await AuthService.login(userData.email, userData.password);
    console.log('Login successful.');
    console.log('Login Response Restaurant ID:', loginResponse.user.restaurantId);

    if (loginResponse.user.restaurantId !== restaurant.restaurant_id) {
      throw new Error('Mismatch in login response restaurant ID');
    }

    console.log('\nVerification PASSED: Centralized login logic is working.');

    // Cleanup
    // console.log('Cleaning up...');
    // await UserModel.delete(registered.user.userId);
    // TODO: Add delete method for restaurant or soft delete

    process.exit(0);
  } catch (error) {
    console.error('\nVerification FAILED:', error.message);
    console.error(error);
    process.exit(1);
  }
}

verifyLoginFlow();
