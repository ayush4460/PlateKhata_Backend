-- ============================================
-- Row Level Security (RLS) Policies
-- Advanced security for multi-tenant scenarios
-- ============================================

-- Enable RLS on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own data
CREATE POLICY user_self_select ON users
    FOR SELECT
    USING (user_id = current_setting('app.current_user_id', TRUE)::INTEGER);

-- Policy: Only admins can view all users
CREATE POLICY admin_view_all_users ON users
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.user_id = current_setting('app.current_user_id', TRUE)::INTEGER 
            AND u.role = 'admin'
        )
    );

-- Policy: Payments can only be viewed by authorized staff
CREATE POLICY staff_view_payments ON payments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.user_id = current_setting('app.current_user_id', TRUE)::INTEGER 
            AND u.role IN ('admin', 'waiter')
        )
    );

-- Policy: Audit logs readable only by admins
CREATE POLICY admin_view_audit ON audit_log
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM users u 
            WHERE u.user_id = current_setting('app.current_user_id', TRUE)::INTEGER 
            AND u.role = 'admin'
        )
    );

-- Add comments
COMMENT ON POLICY user_self_select ON users IS 'Users can only access their own data';
COMMENT ON POLICY admin_view_all_users ON users IS 'Admins have full access to user data';