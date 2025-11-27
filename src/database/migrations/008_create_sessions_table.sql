-- ============================================
-- Sessions Table - Table-specific ordering sessions
-- Security: Automatic expiration, UUID for security
-- ============================================

-- 1. Create Sessions Table
CREATE TABLE IF NOT EXISTS sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id INTEGER NOT NULL REFERENCES tables(table_id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL, -- Passed to frontend
    customer_name VARCHAR(100), -- Cache details here
    customer_phone VARCHAR(15),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    CONSTRAINT expires_after_created CHECK (expires_at > created_at)
);

-- 2. Add session_id to Orders
ALTER TABLE orders
ADD COLUMN session_id UUID REFERENCES sessions(session_id);

-- 3. Indexes
CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_sessions_table_active ON sessions(table_id, is_active);
CREATE INDEX idx_orders_session ON orders(session_id);

-- 4. Function to Clean Table (Admin Feature)
-- This creates a stored procedure we can call from the backend
CREATE OR REPLACE FUNCTION close_table_session(target_table_id INTEGER)
RETURNS VOID AS $$
BEGIN
    -- 1. Expire the active session
    UPDATE sessions 
    SET is_active = FALSE 
    WHERE table_id = target_table_id AND is_active = TRUE;

    -- 2. (Optional) Cancel any pending orders for this table?
    -- Usually better to leave them as is for records, but ensure no NEW items can be added.
END;
$$ LANGUAGE plpgsql;