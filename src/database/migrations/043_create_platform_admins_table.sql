-- Create platform_admins table
CREATE TABLE IF NOT EXISTS platform_admins (
    admin_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'super_admin',
    is_active BOOLEAN DEFAULT TRUE,
    created_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    updated_at BIGINT DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_platform_admins_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_platform_admins_timestamp
    BEFORE UPDATE ON platform_admins
    FOR EACH ROW
    EXECUTE FUNCTION update_platform_admins_updated_at();
