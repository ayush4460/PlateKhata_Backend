-- ============================================
-- Orders Table
-- Security: Foreign key constraints, status validation
-- ============================================

CREATE TABLE IF NOT EXISTS orders (
    order_id SERIAL PRIMARY KEY,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(restaurant_id) ON DELETE CASCADE,
    table_id INTEGER NOT NULL REFERENCES tables(table_id) ON DELETE RESTRICT,
    order_number VARCHAR(50) UNIQUE NOT NULL,
    customer_name VARCHAR(100),
    customer_phone VARCHAR(15),
    customer_email VARCHAR(100),
    order_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    
    -- === NEW COLUMNS ADDED HERE ===
    applied_tax_rate DECIMAL(5, 4) NOT NULL DEFAULT 0.0000,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'Pending',    -- Tracks payment status separately
    -- === END NEW COLUMNS ===

    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    special_instructions TEXT,
    estimated_preparation_time INTEGER,
    served_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    cancelled_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    cancellation_reason TEXT,
    completed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Security Constraints
    CONSTRAINT order_status_valid CHECK (order_status IN (
        'pending', 'confirmed', 'preparing', 'ready', 
        'served', 'completed', 'cancelled'
    )),
    -- === NEW CONSTRAINT ADDED HERE ===
    CONSTRAINT payment_status_valid CHECK (payment_status IN (
        'Pending', 'Approved', 'Failed', 'Refunded'
    )),
    -- === END NEW CONSTRAINT ===
    CONSTRAINT total_amount_valid CHECK (total_amount >= 0 AND total_amount < 1000000),
    CONSTRAINT phone_format CHECK (customer_phone IS NULL OR customer_phone ~* '^\+?[0-9]{10,15}$'),
    CONSTRAINT email_format CHECK (customer_email IS NULL OR customer_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$'),
    CONSTRAINT amounts_consistent CHECK (total_amount = subtotal + tax_amount - discount_amount)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(table_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number);
CREATE INDEX IF NOT EXISTS idx_orders_phone ON orders(customer_phone);
-- === NEW INDEX ADDED HERE ===
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
-- === END NEW INDEX ===

-- Composite index for common queries
CREATE INDEX IF NOT EXISTS idx_orders_table_status ON orders(table_id, order_status);
CREATE INDEX IF NOT EXISTS idx_orders_status_created ON orders(order_status, created_at DESC);

-- Function to generate unique order number (No Change)
-- Function to generate unique order number (No Change)
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    date_prefix TEXT;
    sequence_num INTEGER;
BEGIN
    date_prefix := TO_CHAR(CURRENT_DATE, 'YYYYMMDD');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(order_number FROM 9) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM orders
    WHERE order_number LIKE date_prefix || '%';
    
    new_number := date_prefix || LPAD(sequence_num::TEXT, 4, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Function to set order number automatically
CREATE OR REPLACE FUNCTION set_order_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
        NEW.order_number := generate_order_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate order number
DROP TRIGGER IF EXISTS generate_order_number_trigger ON orders;
CREATE TRIGGER generate_order_number_trigger
    BEFORE INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_order_number();

-- Trigger to auto-update updated_at (No Change - Added DROP for safety)
-- Assumes 'update_updated_at_column' function exists elsewhere
DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to set completed_at timestamp (No Change - Added DROP for safety)
CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_status = 'completed' AND OLD.order_status != 'completed' THEN
        NEW.completed_at := CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_order_completed_at ON orders;
CREATE TRIGGER set_order_completed_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_completed_at();

-- Add comment (With new comments)
COMMENT ON TABLE orders IS 'Customer orders with complete order lifecycle tracking';
COMMENT ON COLUMN orders.order_number IS 'Auto-generated unique order number (YYYYMMDD0001 format)';
COMMENT ON COLUMN orders.served_by IS 'Waiter who served the order';
COMMENT ON COLUMN orders.applied_tax_rate IS 'The tax rate (e.g., 0.08) applied at the time of order.';
COMMENT ON COLUMN orders.payment_status IS 'Tracks the payment status (Pending, Approved, etc.).';