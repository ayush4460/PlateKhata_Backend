-- ============================================
-- Receipts Table
-- Security: Immutable records, unique receipt numbers
-- ============================================

CREATE TABLE IF NOT EXISTS receipts (
    receipt_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE RESTRICT,
    payment_id INTEGER NOT NULL REFERENCES payments(payment_id) ON DELETE RESTRICT,
    receipt_number VARCHAR(50) UNIQUE NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    tax_amount DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,
    tip_amount DECIMAL(10, 2) DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL,
    
    -- Customer Information (snapshot)
    customer_name VARCHAR(100),
    customer_email VARCHAR(100),
    customer_phone VARCHAR(15),
    
    -- Receipt Details
    receipt_type VARCHAR(20) DEFAULT 'final',
    notes TEXT,
    generated_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    
    -- Timestamps
    generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    emailed_at TIMESTAMP,
    
    -- Security Constraints
    CONSTRAINT total_amount_valid CHECK (total_amount = subtotal + tax_amount + tip_amount - discount_amount),
    CONSTRAINT amounts_positive CHECK (
        subtotal >= 0 AND 
        tax_amount >= 0 AND 
        discount_amount >= 0 AND 
        tip_amount >= 0 AND
        total_amount >= 0
    ),
    CONSTRAINT receipt_type_valid CHECK (receipt_type IN ('final', 'duplicate', 'refund'))
);

-- Indexes for performance
CREATE INDEX idx_receipts_order ON receipts(order_id);
CREATE INDEX idx_receipts_payment ON receipts(payment_id);
CREATE INDEX idx_receipts_number ON receipts(receipt_number);
CREATE INDEX idx_receipts_generated ON receipts(generated_at DESC);
CREATE INDEX idx_receipts_email ON receipts(customer_email);

-- Function to generate unique receipt number
CREATE OR REPLACE FUNCTION generate_receipt_number()
RETURNS TEXT AS $$
DECLARE
    new_number TEXT;
    date_prefix TEXT;
    sequence_num INTEGER;
BEGIN
    date_prefix := 'RCP' || TO_CHAR(CURRENT_DATE, 'YYMMDD');
    
    SELECT COALESCE(MAX(CAST(SUBSTRING(receipt_number FROM 10) AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM receipts
    WHERE receipt_number LIKE date_prefix || '%';
    
    new_number := date_prefix || LPAD(sequence_num::TEXT, 5, '0');
    
    RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-generate receipt number
CREATE OR REPLACE FUNCTION set_receipt_number()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.receipt_number IS NULL OR NEW.receipt_number = '' THEN
        NEW.receipt_number := generate_receipt_number();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_receipt_number_trigger
    BEFORE INSERT ON receipts
    FOR EACH ROW
    EXECUTE FUNCTION set_receipt_number();

-- Make receipts immutable (cannot be updated after creation)
CREATE OR REPLACE FUNCTION prevent_receipt_update()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Receipts cannot be modified after creation for audit compliance';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_receipt_modification
    BEFORE UPDATE ON receipts
    FOR EACH ROW
    EXECUTE FUNCTION prevent_receipt_update();

-- Add comment
COMMENT ON TABLE receipts IS 'Immutable receipt records for audit and compliance';
COMMENT ON COLUMN receipts.receipt_number IS 'Auto-generated unique receipt number (RCPYYMMDD00001 format)';
COMMENT ON TRIGGER prevent_receipt_modification ON receipts IS 'Prevents receipt modification for audit compliance';