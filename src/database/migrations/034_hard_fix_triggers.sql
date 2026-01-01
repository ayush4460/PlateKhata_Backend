-- ============================================
-- Migration: Hard Reset of set_completed_at Trigger
-- Fixes "date/time field value out of range" by dropping and recreating
-- the trigger and function to ensure no stale type caching exists.
-- ============================================

BEGIN;

-- 1. Drop Trigger and Function
DROP TRIGGER IF EXISTS set_order_completed_at ON orders;
DROP FUNCTION IF EXISTS set_completed_at;

-- 2. Recreate Function
CREATE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.order_status = 'completed' AND OLD.order_status != 'completed' THEN
        -- Set completed_at to current epoch milliseconds
        -- Explicitly cast to BIGINT
        NEW.completed_at := (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Recreate Trigger
CREATE TRIGGER set_order_completed_at
    BEFORE UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION set_completed_at();

COMMIT;
