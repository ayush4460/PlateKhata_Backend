const db = require('../config/database');

class UserModel {
  /**
   * Create new user
   */
  static async create(userData) {
    const { username, email, passwordHash, fullName, role } = userData;

    const query = `
      INSERT INTO users (username, email, password_hash, full_name, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING user_id, username, email, full_name, role, created_at
    `;

    const result = await db.query(query, [
      username,
      email,
      passwordHash,
      fullName,
      role || 'waiter',
    ]);

    return result.rows[0];
  }

  /**
   * Find user by email
   */
  static async findByEmail(email) {
    const query = `
      SELECT user_id, username, email, password_hash, full_name, role, is_active, created_at
      FROM users
      WHERE email = $1
    `;

    const result = await db.query(query, [email]);
    return result.rows[0];
  }

  /**
   * Find user by ID
   */
  static async findById(userId) {
    const query = `
      SELECT user_id, username, email, full_name, role, is_active, created_at
      FROM users
      WHERE user_id = $1
    `;

    const result = await db.query(query, [userId]);
    return result.rows[0];
  }

  /**
   * Find user by username
   */
  static async findByUsername(username) {
    const query = `
      SELECT user_id, username, email, full_name, role, is_active
      FROM users
      WHERE username = $1
    `;

    const result = await db.query(query, [username]);
    return result.rows[0];
  }

  /**
   * Get all users
   */
  static async findAll(filters = {}) {
    let query = 'SELECT user_id, username, email, full_name, role, is_active, created_at FROM users WHERE 1=1';
    const params = [];
    let paramCount = 1;

    if (filters.role) {
      query += ` AND role = $${paramCount}`;
      params.push(filters.role);
      paramCount++;
    }

    if (filters.isActive !== undefined) {
      query += ` AND is_active = $${paramCount}`;
      params.push(filters.isActive);
      paramCount++;
    }

    query += ' ORDER BY created_at DESC';

    const result = await db.query(query, params);
    return result.rows;
  }

  /**
   * Update user
   */
  static async update(userId, updates) {
    const fields = [];
    const params = [];
    let paramCount = 1;

    if (updates.fullName) {
      fields.push(`full_name = $${paramCount}`);
      params.push(updates.fullName);
      paramCount++;
    }

    if (updates.role) {
      fields.push(`role = $${paramCount}`);
      params.push(updates.role);
      paramCount++;
    }

    if (updates.isActive !== undefined) {
      fields.push(`is_active = $${paramCount}`);
      params.push(updates.isActive);
      paramCount++;
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');

    params.push(userId);

    const query = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE user_id = $${paramCount}
      RETURNING user_id, username, email, full_name, role, is_active, updated_at
    `;

    const result = await db.query(query, params);
    return result.rows[0];
  }

  /**
   * Delete user (soft delete by setting is_active = false)
   */
  static async delete(userId) {
    const query = `
      UPDATE users
      SET is_active = false, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
      RETURNING user_id
    `;

    const result = await db.query(query, [userId]);
    return result.rows[0];
  }
}

module.exports = UserModel;