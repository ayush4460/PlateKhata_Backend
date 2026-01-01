-- ============================================
-- Migration: Convert orders.completed_at to BIGINT (Epoch Milliseconds)
-- This was missed in 031 and causes trigger errors.
-- ============================================

BEGIN;

ALTER TABLE orders 
    ALTER COLUMN completed_at TYPE BIGINT USING (EXTRACT(EPOCH FROM completed_at) * 1000)::BIGINT;

COMMIT;
