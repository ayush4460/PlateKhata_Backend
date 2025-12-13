-- ============================================
-- Tables Table - Restaurant Tables
-- Security: Input validation, unique constraints
-- ============================================

CREATE TABLE IF NOT EXISTS tables (
    table_id SERIAL PRIMARY KEY,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(restaurant_id) ON DELETE CASCADE,
    table_number VARCHAR(10) NOT NULL,
    qr_code_url VARCHAR(255),
    capacity INTEGER NOT NULL,
    floor_number INTEGER DEFAULT 1,
    section VARCHAR(50),
    is_available BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Security Constraints
    CONSTRAINT table_number_format CHECK (table_number ~* '^[A-Z0-9-]+$'),
    CONSTRAINT capacity_positive CHECK (capacity > 0 AND capacity <= 20),
    CONSTRAINT floor_positive CHECK (floor_number > 0 AND floor_number <= 10)
);

-- Indexes for performance
CREATE INDEX idx_tables_number ON tables(table_number);
CREATE INDEX idx_tables_availability ON tables(is_available);
CREATE INDEX idx_tables_active ON tables(is_active);
CREATE INDEX idx_tables_floor ON tables(floor_number);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_tables_updated_at
    BEFORE UPDATE ON tables
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE tables IS 'Restaurant tables with QR codes for contactless ordering';
COMMENT ON COLUMN tables.qr_code_url IS 'Path to generated QR code image';
COMMENT ON COLUMN tables.is_active IS 'Soft delete flag - inactive tables are hidden';