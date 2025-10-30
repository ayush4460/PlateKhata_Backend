// backend/src/services/settings.service.js
const db = require('../config/database'); // Your DB config
const ApiError = require('../utils/apiError');

class SettingsService {
  /**
   * Updates a setting in the database (e.g., 'tax_rate').
   * Uses INSERT ... ON CONFLICT (UPSERT) to create the setting if it doesn't exist.
   */
  static async updateSetting(key, value) {
    const query = `
        INSERT INTO settings (setting_key, setting_value, updated_at)
        VALUES ($1, $2, CURRENT_TIMESTAMP)
        ON CONFLICT (setting_key) DO UPDATE SET
          setting_value = EXCLUDED.setting_value,
          updated_at = CURRENT_TIMESTAMP;
      `;
      try {
          await db.query(query, [key, String(value)]); // Store value as text/varchar
          console.log(`[SettingsService] Setting updated: ${key} = ${value}`);
      } catch (error) {
          console.error(`[SettingsService] Failed to update setting ${key}:`, error);
          throw ApiError.internalError('Failed to update setting.');
      }
  }

  /**
   * Retrieves a setting from the database.
   */
  static async getSetting(key) {
      const query = `SELECT setting_value FROM settings WHERE setting_key = $1`;
      try {
          const result = await db.query(query, [key]);
          if (result.rows.length > 0) {
              return result.rows[0].setting_value;
          }
          return null; // No setting found
      } catch (error) {
          console.error(`[SettingsService] Failed to get setting ${key}:`, error);
          return null; // Or throw error
      }
  }
}

module.exports = SettingsService;