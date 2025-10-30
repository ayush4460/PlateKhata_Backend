-- ============================================
-- Sessions Table - Table-specific ordering sessions
-- Security: Automatic expiration, UUID for security
-- ============================================

CREATE TABLE IF NOT EXISTS sessions (
    session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_id INTEGER NOT NULL REFERENCES tables(table_id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    ip_address INET,
    user_agent TEXT,
    last_activity_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    
    -- Security Constraints
    CONSTRAINT expires_after_created CHECK (expires_at > created_at)
);

-- Indexes for performance
CREATE INDEX idx_sessions_table ON sessions(table_id);
CREATE INDEX idx_sessions_active ON sessions(is_active);
CREATE INDEX idx_sessions_token ON sessions(session_token);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- Composite index
CREATE INDEX idx_sessions_table_active ON sessions(table_id, is_active);

-- Function to auto-expire old sessions
CREATE OR REPLACE FUNCTION expire_old_sessions()
RETURNS void AS $$
BEGIN
    UPDATE sessions
    SET is_active = FALSE
    WHERE expires_at < CURRENT_TIMESTAMP AND is_active = TRUE;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update last_activity
CREATE OR REPLACE FUNCTION update_last_activity()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_activity_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_session_activity
    BEFORE UPDATE ON sessions
    FOR EACH ROW
    WHEN (OLD.last_activity_at IS DISTINCT FROM NEW.last_activity_at)
    EXECUTE FUNCTION update_last_activity();

-- Add comment
COMMENT ON TABLE sessions IS 'Table-specific sessions for customer ordering with automatic expiration';
COMMENT ON COLUMN sessions.session_token IS 'Secure random token for session identification';
COMMENT ON COLUMN sessions.ip_address IS 'Customer IP address for security tracking';