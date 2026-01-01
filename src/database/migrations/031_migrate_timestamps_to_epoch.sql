-- Migration: Convert all TIMESTAMP columns to BIGINT (Epoch Milliseconds)

BEGIN;

-- Drop dependent views
DROP VIEW IF EXISTS v_order_summary;
DROP VIEW IF EXISTS v_kitchen_orders;

-- 1. Orders
ALTER TABLE orders ALTER COLUMN created_at DROP DEFAULT;
ALTER TABLE orders ALTER COLUMN updated_at DROP DEFAULT;
ALTER TABLE orders 
    ALTER COLUMN created_at TYPE BIGINT USING (EXTRACT(EPOCH FROM created_at) * 1000)::BIGINT,
    ALTER COLUMN updated_at TYPE BIGINT USING (EXTRACT(EPOCH FROM updated_at) * 1000)::BIGINT;
ALTER TABLE orders ALTER COLUMN created_at SET DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
ALTER TABLE orders ALTER COLUMN updated_at SET DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;

-- 2. Users
ALTER TABLE users ALTER COLUMN created_at DROP DEFAULT;
-- updated_at might not have default, but safe to try dropping or just altering
ALTER TABLE users ALTER COLUMN updated_at DROP DEFAULT; 
ALTER TABLE users 
    ALTER COLUMN created_at TYPE BIGINT USING (EXTRACT(EPOCH FROM created_at) * 1000)::BIGINT,
    ALTER COLUMN updated_at TYPE BIGINT USING (EXTRACT(EPOCH FROM updated_at) * 1000)::BIGINT;
ALTER TABLE users ALTER COLUMN created_at SET DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
ALTER TABLE users ALTER COLUMN updated_at SET DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;

-- 3. Restaurants
ALTER TABLE restaurants ALTER COLUMN created_at DROP DEFAULT;
ALTER TABLE restaurants ALTER COLUMN updated_at DROP DEFAULT;
ALTER TABLE restaurants 
    ALTER COLUMN created_at TYPE BIGINT USING (EXTRACT(EPOCH FROM created_at) * 1000)::BIGINT,
    ALTER COLUMN updated_at TYPE BIGINT USING (EXTRACT(EPOCH FROM updated_at) * 1000)::BIGINT;
ALTER TABLE restaurants ALTER COLUMN created_at SET DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
ALTER TABLE restaurants ALTER COLUMN updated_at SET DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;

-- 4. Tables
ALTER TABLE tables ALTER COLUMN created_at DROP DEFAULT;
ALTER TABLE tables ALTER COLUMN updated_at DROP DEFAULT;
ALTER TABLE tables 
    ALTER COLUMN created_at TYPE BIGINT USING (EXTRACT(EPOCH FROM created_at) * 1000)::BIGINT,
    ALTER COLUMN updated_at TYPE BIGINT USING (EXTRACT(EPOCH FROM updated_at) * 1000)::BIGINT;
ALTER TABLE tables ALTER COLUMN created_at SET DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
ALTER TABLE tables ALTER COLUMN updated_at SET DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;

-- 5. Menu Items
ALTER TABLE menu_items ALTER COLUMN created_at DROP DEFAULT;
ALTER TABLE menu_items ALTER COLUMN updated_at DROP DEFAULT;
ALTER TABLE menu_items 
    ALTER COLUMN created_at TYPE BIGINT USING (EXTRACT(EPOCH FROM created_at) * 1000)::BIGINT,
    ALTER COLUMN updated_at TYPE BIGINT USING (EXTRACT(EPOCH FROM updated_at) * 1000)::BIGINT;
ALTER TABLE menu_items ALTER COLUMN created_at SET DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
ALTER TABLE menu_items ALTER COLUMN updated_at SET DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;

-- 6. Payments
ALTER TABLE payments ALTER COLUMN created_at DROP DEFAULT;
-- paid_at might be null or no default. check usage. Usually nullable.
ALTER TABLE payments 
    ALTER COLUMN created_at TYPE BIGINT USING (EXTRACT(EPOCH FROM created_at) * 1000)::BIGINT,
    ALTER COLUMN paid_at TYPE BIGINT USING (EXTRACT(EPOCH FROM paid_at) * 1000)::BIGINT;
ALTER TABLE payments ALTER COLUMN created_at SET DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;

-- 7. Receipts
ALTER TABLE receipts ALTER COLUMN generated_at DROP DEFAULT;
ALTER TABLE receipts 
    ALTER COLUMN generated_at TYPE BIGINT USING (EXTRACT(EPOCH FROM generated_at) * 1000)::BIGINT,
    ALTER COLUMN emailed_at TYPE BIGINT USING (EXTRACT(EPOCH FROM emailed_at) * 1000)::BIGINT;
ALTER TABLE receipts ALTER COLUMN generated_at SET DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;

-- 8. Sessions
ALTER TABLE sessions ALTER COLUMN created_at DROP DEFAULT;
ALTER TABLE sessions 
    ALTER COLUMN created_at TYPE BIGINT USING (EXTRACT(EPOCH FROM created_at) * 1000)::BIGINT,
    ALTER COLUMN expires_at TYPE BIGINT USING (EXTRACT(EPOCH FROM expires_at) * 1000)::BIGINT;
ALTER TABLE sessions ALTER COLUMN created_at SET DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;

-- 9. Audit Log
ALTER TABLE audit_log ALTER COLUMN created_at DROP DEFAULT;
ALTER TABLE audit_log 
    ALTER COLUMN created_at TYPE BIGINT USING (EXTRACT(EPOCH FROM created_at) * 1000)::BIGINT;
ALTER TABLE audit_log ALTER COLUMN created_at SET DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;

-- 10. Settings
ALTER TABLE settings ALTER COLUMN created_at DROP DEFAULT;
ALTER TABLE settings ALTER COLUMN updated_at DROP DEFAULT;
ALTER TABLE settings 
    ALTER COLUMN created_at TYPE BIGINT USING (EXTRACT(EPOCH FROM created_at) * 1000)::BIGINT,
    ALTER COLUMN updated_at TYPE BIGINT USING (EXTRACT(EPOCH FROM updated_at) * 1000)::BIGINT;
ALTER TABLE settings ALTER COLUMN created_at SET DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;
ALTER TABLE settings ALTER COLUMN updated_at SET DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT;

-- Recreate Views

-- View: Order summary (without sensitive customer data)
CREATE OR REPLACE VIEW v_order_summary AS
SELECT 
    o.order_id,
    o.order_number,
    o.table_id,
    t.table_number,
    o.order_status,
    o.total_amount,
    o.created_at,
    COUNT(oi.order_item_id) as item_count
FROM orders o
JOIN tables t ON o.table_id = t.table_id
LEFT JOIN order_items oi ON o.order_id = oi.order_id
GROUP BY o.order_id, o.order_number, o.table_id, t.table_number, o.order_status, o.total_amount, o.created_at;

-- View: Kitchen orders (only relevant fields for kitchen staff)
CREATE OR REPLACE VIEW v_kitchen_orders AS
SELECT 
    o.order_id,
    o.order_number,
    t.table_number,
    o.order_status,
    oi.order_item_id,
    oi.item_name,
    oi.quantity,
    oi.special_instructions,
    o.created_at
FROM orders o
JOIN tables t ON o.table_id = t.table_id
JOIN order_items oi ON o.order_id = oi.order_id
WHERE o.order_status IN ('pending', 'confirmed', 'preparing')
ORDER BY o.created_at ASC;

COMMIT;
