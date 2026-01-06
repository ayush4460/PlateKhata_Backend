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

            // 1. CONCURRENT ORDERS CHECK (Time Gap)
            // If session was created very recently (e.g., < 30 seconds), it's likely part of a burst of requests.
            // Trust it immediately to ensure all items in this burst get the same session.
            // User requested 10s gap, using 30s as a safe buffer.
            const sessionAgeMs = Date.now() - new Date(session.created_at).getTime();
            if (sessionAgeMs < 30000) { 
                console.log(`[SessionService] Reusing recent session ${session.session_id} (Age: ${sessionAgeMs}ms)`);
                return session;
            }

            // 2. EXISTING ORDERS CHECK (Running or Paid Status)
            // Check if the session has any valid orders (Pending, Active, or Paid/Completed).
            // We only filter out 'cancelled' to treat sessions with only cancelled orders as empty.
            // This ensures "Paid & Occupied" tables can accept new Add-ons.
            const hasOrdersRes = await client.query(
                `SELECT 1 FROM orders
                    WHERE session_id = $1
                    AND order_status != 'cancelled'
                    LIMIT 1`,
                [session.session_id]
            );

            if (hasOrdersRes.rows.length > 0) {
                // Session is occupied/used (Running or Paid)
                return session;
            }

            // 3. EXPIRE STALE EMPTY SESSION
            // If we are here, session is Old (>30s) AND Empty (No valid orders).
            // It is likely a "ghost" session from an abandoned attempt.
            console.log(`[SessionService] Expiring stale empty session ${session.session_id}`);
            await this.expireSession(session.session_id, client);
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