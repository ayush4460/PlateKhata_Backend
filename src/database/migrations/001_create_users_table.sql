-- ============================================
-- Users Table - System Users (Admin, Kitchen, Waiter)
-- Security: Password hashing, role-based access
-- ============================================

CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'kitchen', 'waiter')),
    is_active BOOLEAN DEFAULT TRUE,
    restaurant_id INTEGER REFERENCES restaurants(restaurant_id) ON DELETE SET NULL,
    failed_login_attempts INTEGER DEFAULT 0,
    last_login_at TIMESTAMP,
    password_changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Security Constraints
    CONSTRAINT username_min_length CHECK (LENGTH(username) >= 3),
    CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(is_active);
CREATE INDEX idx_users_restaurant_id ON users(restaurant_id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default admin user (password will be hashed by seed script)
-- Default password: Admin@123 (change immediately after first login)
INSERT INTO users (username, email, password_hash, full_name, role, restaurant_id) 
VALUES (
    'admin', 
    'admin@restaurant.com', 
    '$2a$10$placeholder_hash_will_be_replaced_by_seed_script',
    'System Administrator', 
    'admin',
    NULL
) ON CONFLICT (username) DO NOTHING;

-- Add comment
COMMENT ON TABLE users IS 'System users with role-based access control';
COMMENT ON COLUMN users.failed_login_attempts IS 'Track failed login attempts for security';
COMMENT ON COLUMN users.password_changed_at IS 'Track when password was last changed';