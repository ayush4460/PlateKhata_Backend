// backend/src/services/session.service.js
const db = require('../config/database');
const crypto = require('crypto');

class SessionService {

    static async getOrCreateSession(tableId) {
        // Check for an active session
        const existingRes = await db.query(
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

            const activeOrdersRes = await db.query(
                `SELECT 1 FROM orders
                    WHERE session_id = $1
                    AND order_status NOT IN ('completed', 'cancelled')
                    AND payment_status != 'Approved'
                    LIMIT 1`,
                [session.session_id]
            );

            // Check if session has recently completed orders (grace period)
            const recentCompletedRes = await db.query(
                `SELECT 1 FROM orders
                    WHERE session_id = $1
                    AND order_status = 'completed'
                    AND payment_status = 'Approved'
                    AND updated_at > ((EXTRACT(EPOCH FROM NOW()) - 600) * 1000)::BIGINT
                    LIMIT 1`,
                [session.session_id]
            );

            // If session exists and has active orders OR recent completed orders, RETURN IT
            if (activeOrdersRes.rows.length > 0 || recentCompletedRes.rows.length > 0) {
                return session;
            }

            // Otherwise expire it
            await this.expireSession(session.session_id);
        }

        // Create a fresh session
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = Date.now() + (0.75 * 60 * 60 * 1000); // 45 mins in ms

        const newSession = await db.query(
            `INSERT INTO sessions (table_id, session_token, expires_at, is_active)
                VALUES ($1, $2, $3, TRUE)
                RETURNING *`,
            [tableId, token, expiresAt]
        );

        return newSession.rows[0];
    }

    static async validateSession(token) {
        const { rows } = await db.query(
            `SELECT * FROM sessions WHERE session_token = $1 LIMIT 1`,
            [token]
        );
        if (rows.length === 0) return null;

        const s = rows[0];
        const now = Date.now();

        if (s.expires_at && Number(s.expires_at) <= now) {
            return null;
        }

        return s;
    }


    static async updateCustomerDetails(sessionId, name, phone) {
        await db.query(
            `UPDATE sessions
            SET customer_name = $1, customer_phone = $2 
            WHERE session_id = $3`,
            [name, phone, sessionId]
        );
    }

    static async getSessionById(sessionId) {
        const res = await db.query(`SELECT * FROM sessions WHERE session_id = $1`, [sessionId]);
        return res.rows[0];
    }

    static async expireSession(sessionId) {
        await db.query(
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