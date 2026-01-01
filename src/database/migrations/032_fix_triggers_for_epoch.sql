-- ============================================
-- Fix Triggers for Epoch Time (BIGINT)
-- Replaces CURRENT_TIMESTAMP with Epoch Milliseconds
-- ============================================

-- 1. Fix global updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    -- Set updated_at to current epoch milliseconds
    NEW.updated_at = (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. Fix set_completed_at trigger function for orders
CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_status = 'completed' AND OLD.order_status != 'completed' THEN
        -- Set completed_at to current epoch milliseconds
        NEW.completed_at := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
