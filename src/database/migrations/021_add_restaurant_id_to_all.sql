-- Add restaurant_id to Order Items
ALTER TABLE order_items 
ADD COLUMN restaurant_id INTEGER REFERENCES restaurants(restaurant_id) ON DELETE CASCADE;
CREATE INDEX idx_order_items_restaurant ON order_items(restaurant_id);

-- Add restaurant_id to Payments
ALTER TABLE payments 
ADD COLUMN restaurant_id INTEGER REFERENCES restaurants(restaurant_id) ON DELETE CASCADE;
CREATE INDEX idx_payments_restaurant ON payments(restaurant_id);

-- Add restaurant_id to Receipts
ALTER TABLE receipts 
ADD COLUMN restaurant_id INTEGER REFERENCES restaurants(restaurant_id) ON DELETE CASCADE;
CREATE INDEX idx_receipts_restaurant ON receipts(restaurant_id);

-- Add restaurant_id to Sessions
ALTER TABLE sessions 
ADD COLUMN restaurant_id INTEGER REFERENCES restaurants(restaurant_id) ON DELETE CASCADE;
CREATE INDEX idx_sessions_restaurant ON sessions(restaurant_id);

-- Add restaurant_id to Audit Log
ALTER TABLE audit_log 
ADD COLUMN restaurant_id INTEGER REFERENCES restaurants(restaurant_id) ON DELETE CASCADE;
CREATE INDEX idx_audit_log_restaurant ON audit_log(restaurant_id);

-- Attempt to backfill data based on relationships (Best Effort)
-- Order Items -> Orders
UPDATE order_items oi
SET restaurant_id = o.restaurant_id
FROM orders o
WHERE oi.order_id = o.order_id;

-- Payments -> Orders
UPDATE payments p
SET restaurant_id = o.restaurant_id
FROM orders o
WHERE p.order_id = o.order_id;

-- Receipts -> Orders
UPDATE receipts r
SET restaurant_id = o.restaurant_id
FROM orders o
WHERE r.order_id = o.order_id;

-- Sessions -> Tables
UPDATE sessions s
SET restaurant_id = t.restaurant_id
FROM tables t
WHERE s.table_id = t.table_id;

-- Audit Log -> Users (if possible, or just null)
UPDATE audit_log al
SET restaurant_id = u.restaurant_id
FROM users u
WHERE al.user_id = u.user_id;
