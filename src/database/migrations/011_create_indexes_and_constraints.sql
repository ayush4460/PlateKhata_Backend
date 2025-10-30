-- ============================================
-- Additional Indexes and Performance Optimization
-- ============================================

-- Partial indexes for frequently accessed data
CREATE INDEX idx_orders_active ON orders(order_id) WHERE order_status NOT IN ('completed', 'cancelled');
CREATE INDEX idx_menu_available ON menu_items(item_id) WHERE is_available = TRUE;
CREATE INDEX idx_tables_available ON tables(table_id) WHERE is_available =TRUE AND is_active = TRUE;-- Composite indexes for complex queries
CREATE INDEX idx_orders_table_created ON orders(table_id, created_at DESC);
CREATE INDEX idx_payments_order_status ON payments(order_id, payment_status);
CREATE INDEX idx_order_items_order_created ON order_items(order_id, created_at);-- Index for date-range queries (common for reports)
CREATE INDEX idx_orders_date_range ON orders(created_at) WHERE order_status = 'completed';
CREATE INDEX idx_payments_date_range ON payments(paid_at) WHERE payment_status = 'completed';-- GIN indexes for array columns (faster array searches)
CREATE INDEX idx_menu_allergens ON menu_items USING GIN(allergens);
CREATE INDEX idx_menu_ingredients ON menu_items USING GIN(ingredients);-- Add statistics for query optimizer
ANALYZE users;
ANALYZE tables;
ANALYZE menu_items;
ANALYZE orders;
ANALYZE order_items;
ANALYZE payments;
ANALYZE receipts;
ANALYZE sessions;

-- Add comments
COMMENT ON INDEX idx_orders_active IS 'Speeds up queries for active orders only';
COMMENT ON INDEX idx_menu_available IS 'Optimizes menu item availability checks';