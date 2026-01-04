// backend/src/services/settings.service.js
const db = require('../config/database');
const ApiError = require('../utils/apiError');
const RestaurantModel = require('../models/restaurant.model');

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-') // Replace spaces, non-word chars with -
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing -
};

class SettingsService {
    /**
   * Updates a setting in the database (e.g., 'tax_rate').
   */
    static async updateSetting(restaurantId, key, value) {
        // Ideally constraint should be on (restaurant_id, setting_key)
        // We will assume the DB handles this or we just insert/update based on key for now 
        // but ensuring restaurant_id is part of the row.
        const query = `
            INSERT INTO settings (restaurant_id, setting_key, setting_value, updated_at)
            VALUES ($1, $2, $3, (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT)
            ON CONFLICT (setting_key) DO UPDATE SET
            setting_value = EXCLUDED.setting_value,
            restaurant_id = EXCLUDED.restaurant_id, 
            updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
        `;
        try {
            await db.query(query, [restaurantId, key, String(value)]); 
            console.log(`[SettingsService] Setting updated: ${key} = ${value} (Rest: ${restaurantId})`);
        } catch (error) {
            console.error(`[SettingsService] Failed to update setting ${key}:`, error);
            throw ApiError.internal('Failed to update setting.');
        }
    }

    /**
   * Retrieves a setting from the database.
   */
    static async getSetting(key, restaurantId = null) {
        let query = `SELECT setting_value FROM settings WHERE setting_key = $1`;
        const params = [key];

        if (restaurantId) {
            query += ` AND restaurant_id = $2`;
            params.push(restaurantId);
        }

        try {
            const result = await db.query(query, params);
            if (result.rows.length > 0) {
                return result.rows[0].setting_value;
            }
            return null;
        } catch (error) {
            console.error(`[SettingsService] Failed to get setting ${key}:`, error);
            return null;
        }
    }

    /**
     * Updates restaurant core details (Name, Address, Tagline, Slug)
     */
    static async updateRestaurantDetails(restaurantId, data) {
        try {
            const updatePayload = {};
            if (data.address) updatePayload.address = data.address;
            if (data.contactEmail) updatePayload.contactEmail = data.contactEmail;
            if (data.tagline) updatePayload.tagline = data.tagline;

            // Handle Name & Slug Change
            if (data.name) {
                updatePayload.name = data.name;
                const newSlug = slugify(data.name);
                
                // Check if slug is different and unique
                const currentRest = await RestaurantModel.findById(restaurantId);
                if (currentRest && currentRest.slug !== newSlug) {
                    // Check uniqueness
                    const existing = await RestaurantModel.findBySlug(newSlug);
                    if (existing && existing.restaurant_id !== restaurantId) {
                         // Append random string if collision (though unlikely for distinct names)
                         updatePayload.slug = `${newSlug}-${Date.now().toString().slice(-4)}`;
                    } else {
                        updatePayload.slug = newSlug;
                    }
                }
            }

            // Platform IDs
            if (data.zomatoRestaurantId) updatePayload.zomatoRestaurantId = data.zomatoRestaurantId;
            if (data.swiggyRestaurantId) updatePayload.swiggyRestaurantId = data.swiggyRestaurantId;

            // New fields
            if (data.contactNumber) updatePayload.contactNumber = data.contactNumber;
            if (data.fssaiLicNo) updatePayload.fssaiLicNo = data.fssaiLicNo;
            if (data.gstin) updatePayload.gstin = data.gstin;

            const updatedRestaurant = await RestaurantModel.update(restaurantId, updatePayload);
            return updatedRestaurant;
        } catch (error) {
             console.error(`[SettingsService] Failed to update restaurant details:`, error);
             throw ApiError.internal('Failed to update restaurant details.');
        }
    }
}

module.exports = SettingsService;