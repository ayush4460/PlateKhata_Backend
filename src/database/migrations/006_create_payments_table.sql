-- ============================================
-- Payments Table
-- Security: Encrypted sensitive data, audit trail
-- ============================================

CREATE TABLE IF NOT EXISTS payments (
    payment_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE RESTRICT,
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(20) NOT NULL,
    payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    transaction_id VARCHAR(100) UNIQUE,
    
    -- Payment Gateway Fields (Razorpay)
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    razorpay_signature VARCHAR(255),
    
    -- Payment Gateway Fields (Stripe)
    stripe_payment_intent_id VARCHAR(100),
    stripe_charge_id VARCHAR(100),
    
    -- Card Information (Never store full card number - PCI DSS compliant)
    card_last_four VARCHAR(4),
    card_brand VARCHAR(20),
    
    -- Payment Details
    currency VARCHAR(3) DEFAULT 'INR',
    payment_gateway VARCHAR(20),
    gateway_response TEXT,
    error_code VARCHAR(50),
    error_message TEXT,
    
    -- Timestamps
    paid_at TIMESTAMP,
    refunded_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Security Constraints
    CONSTRAINT payment_method_valid CHECK (payment_method IN ('cash', 'card', 'upi', 'online', 'wallet')),
    CONSTRAINT payment_status_valid CHECK (payment_status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled')),
    CONSTRAINT amount_positive CHECK (amount > 0 AND amount < 1000000),
    CONSTRAINT currency_valid CHECK (currency IN ('INR', 'USD', 'EUR', 'GBP')),
    CONSTRAINT card_last_four_format CHECK (card_last_four IS NULL OR card_last_four ~* '^[0-9]{4}$')
);

-- Indexes for performance
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(payment_status);
CREATE INDEX idx_payments_transaction ON payments(transaction_id);
CREATE INDEX idx_payments_created ON payments(created_at DESC);
CREATE INDEX idx_payments_method ON payments(payment_method);

-- Composite indexes
CREATE INDEX idx_payments_status_created ON payments(payment_status, created_at DESC);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_payments_updated_at
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger to set paid_at timestamp
CREATE OR REPLACE FUNCTION set_paid_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_status = 'completed' AND OLD.payment_status != 'completed' THEN
        NEW.paid_at := CURRENT_TIMESTAMP;
    END IF;
    IF NEW.payment_status = 'refunded' AND OLD.payment_status != 'refunded' THEN
        NEW.refunded_at := CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_payment_timestamps
    BEFORE UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION set_paid_at();

-- Add comment
COMMENT ON TABLE payments IS 'Payment transactions with PCI DSS compliant data storage';
COMMENT ON COLUMN payments.card_last_four IS 'Last 4 digits only - NEVER store full card number';
COMMENT ON COLUMN payments.gateway_response IS 'Complete gateway response for debugging (sanitized)';