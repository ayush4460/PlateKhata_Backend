-- ============================================
-- Order Items Table
-- Security: Foreign key constraints, price validation
-- ============================================

CREATE TABLE IF NOT EXISTS order_items (
    order_item_id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
    item_id INTEGER NOT NULL REFERENCES menu_items(item_id) ON DELETE RESTRICT,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_price DECIMAL(10, 2) NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    item_category VARCHAR(50) NOT NULL,
    special_instructions TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    prepared_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Security Constraints
    CONSTRAINT quantity_positive CHECK (quantity > 0 AND quantity <= 99),
    CONSTRAINT unit_price_positive CHECK (unit_price > 0 AND unit_price < 100000),
    CONSTRAINT total_price_valid CHECK (total_price = unit_price * quantity),
    CONSTRAINT status_valid CHECK (status IN ('pending', 'preparing', 'ready', 'served'))
);

-- Indexes for performance
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_item ON order_items(item_id);
CREATE INDEX idx_order_items_status ON order_items(status);
CREATE INDEX idx_order_items_created ON order_items(created_at);

-- Composite index
CREATE INDEX idx_order_items_order_status ON order_items(order_id, status);

-- Trigger to update order total when items change
CREATE OR REPLACE FUNCTION update_order_total()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE orders
    SET 
        subtotal = (
            SELECT COALESCE(SUM(total_price), 0)
            FROM order_items
            WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
        ),
        tax_amount = subtotal * 0.05,  -- 5% tax
        total_amount = subtotal + tax_amount - COALESCE(discount_amount, 0)
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_order_total_on_insert
    AFTER INSERT ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_order_total();

CREATE TRIGGER update_order_total_on_update
    AFTER UPDATE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_order_total();

CREATE TRIGGER update_order_total_on_delete
    AFTER DELETE ON order_items
    FOR EACH ROW
    EXECUTE FUNCTION update_order_total();

-- Add comment
COMMENT ON TABLE order_items IS 'Individual items within each order with historical price tracking';
COMMENT ON COLUMN order_items.item_name IS 'Snapshot of item name at time of order (for historical records)';
COMMENT ON COLUMN order_items.unit_price IS 'Price per unit at time of order (may differ from current menu price)';