const db = require('../config/database');

class PlatformAdminModel {
  /**
   * Create new platform admin
   */
  static async create(adminData) {
    const { username, email, passwordHash, fullName, role } = adminData;

    const query = `
      INSERT INTO platform_admins (username, email, password_hash, full_name, role)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING admin_id, username, email, full_name, role, created_at
    `;

    const result = await db.query(query, [
      username,
      email,
      passwordHash,
      fullName,
      role || 'super_admin'
    ]);

    return result.rows[0];
  }

  /**
   * Find by email
   */
  static async findByEmail(email) {
    const query = `SELECT * FROM platform_admins WHERE email = $1`;
    const result = await db.query(query, [email]);
    return result.rows[0];
  }

  /**
   * Find by ID
   */
  static async findById(id) {
    const query = `SELECT * FROM platform_admins WHERE admin_id = $1`;
    const result = await db.query(query, [id]);
    return result.rows[0];
  }

  /**
   * Find by Username
   */
   static async findByUsername(username) {
    const query = `SELECT * FROM platform_admins WHERE username = $1`;
    const result = await db.query(query, [username]);
    return result.rows[0];
  }
}

module.exports = PlatformAdminModel;
