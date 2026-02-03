// backend/src/services/session.service.js
const db = require('../config/database');
const crypto = require('crypto');

class SessionService {

    static async getOrCreateSession(tableId, client = db) {
        // Check for an active session
        const existingRes = await client.query(
            `SELECT * FROM sessions
                WHERE table_id = $1
                AND is_active = TRUE
                AND (expires_at IS NULL OR expires_at > (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT)
                ORDER BY created_at DESC
                LIMIT 1`,
            [tableId]
        );

        if (existingRes.rows.length > 0) {
            const session = existingRes.rows[0];
            // SIMPLIFIED: Always reuse an active session if it exists. 
            // This prevents duplicate session creation during race conditions or rapid ordering.
            // Stale empty sessions should be cleaned up by a background cron job if needed.
            console.log(`[SessionService] Reusing existing session ${session.session_id}`);
            return session;
        }

        // Create a fresh session
        const token = crypto.randomBytes(32).toString('hex');
        const newSession = await client.query(
            `INSERT INTO sessions (table_id, session_token, expires_at, is_active)
                VALUES ($1, $2, (EXTRACT(EPOCH FROM NOW() + INTERVAL '45 minutes') * 1000)::BIGINT, TRUE)
                RETURNING *`,
            [tableId, token]
        );

        return newSession.rows[0];
    }

    static async validateSession(token, client = db) {
        // Check expiration in SQL to avoid clock skew
        const { rows } = await client.query(
            `SELECT * FROM sessions 
             WHERE session_token = $1 
             AND (expires_at IS NULL OR expires_at > (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT)
             LIMIT 1`,
            [token]
        );
        if (rows.length === 0) return null;

        return rows[0];
    }


    static async updateCustomerDetails(sessionId, name, phone, client = db) {
        // Ensure phone is NULL if empty string to avoid check constraint violations
        const safePhone = phone && phone.trim() !== '' ? phone : null;

        await client.query(
            `UPDATE sessions
            SET customer_name = $1, customer_phone = $2 
            WHERE session_id = $3`,
            [name, safePhone, sessionId]
        );

        // Sync to orders for consistency
        await client.query(
            `UPDATE orders
            SET customer_name = $1, customer_phone = $2
            WHERE session_id = $3`,
            [name, safePhone, sessionId]
        );
    }

    static async getSessionById(sessionId) {
        const res = await db.query(`SELECT * FROM sessions WHERE session_id = $1`, [sessionId]);
        return res.rows[0];
    }

    static async expireSession(sessionId, client = db) {
        await client.query(
            `UPDATE sessions
                SET is_active = FALSE
                WHERE session_id = $1`,
            [sessionId]
        );
    }

    static async clearTable(tableId) {
        await db.query(
            `UPDATE sessions 
             SET is_active = FALSE 
             WHERE table_id = $1`,
            [tableId]
        );
    }

    /**
     * Set grace period for session (called after payment approval)
     */
    static async setGracePeriod(sessionId, minutes = 10) {
        const expiryTime = Date.now() + (minutes * 60 * 1000);
        await db.query(
            `UPDATE sessions
                SET expires_at = $1, is_active = false
                WHERE session_id = $2`,
            [expiryTime, sessionId]
        );
        console.log(`[SessionService] Grace period set for session ${sessionId} until ${expiryTime}`);
    }
}

module.exports = SessionService;