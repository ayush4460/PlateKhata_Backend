-- ============================================
-- Order Item Customizations Table
-- ============================================

CREATE TABLE IF NOT EXISTS order_item_customizations (
    selection_id SERIAL PRIMARY KEY,
    order_item_id INTEGER NOT NULL REFERENCES order_items(order_item_id) ON DELETE CASCADE,
    option_id INTEGER REFERENCES customization_options(option_id) ON DELETE SET NULL, -- Keep record even if option deleted? Or snapshot?
    price DECIMAL(10, 2) NOT NULL DEFAULT 0.00, -- Snapshot of the price charged
    name VARCHAR(100) NOT NULL, -- Snapshot of the option name
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for performance
CREATE INDEX idx_order_item_cust_item ON order_item_customizations(order_item_id);
