const RestaurantModel = require('../models/restaurant.model');

class PublicService {
  static async getAllActiveRestaurants() {
    const restaurants = await RestaurantModel.findAll({ isActive: true });
    // Filter out sensitive info if any, return only public info
    return restaurants.map(r => ({
        restaurant_id: r.restaurant_id,
        name: r.name,
        slug: r.slug,
        address: r.address,
        logo: r.logo || null, 
        contact_email: r.contact_email
    }));
  }
}

module.exports = PublicService;
