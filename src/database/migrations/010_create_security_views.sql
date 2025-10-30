-- ============================================
-- Security Views - Safe data access without exposing sensitive information
-- ============================================

-- View: Active menu items (without internal fields)
CREATE OR REPLACE VIEW v_active_menu AS
SELECT 
    item_id,
    name,
    description,
    category,
    price,
    image_url,
    is_vegetarian,
    is_vegan,
    is_gluten_free,
    spice_level,
    preparation_time,
    display_order
FROM menu_items
WHERE is_available = TRUE
ORDER BY display_order, name;

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

-- Add comments
COMMENT ON VIEW v_active_menu IS 'Public view of available menu items';
COMMENT ON VIEW v_order_summary IS 'Safe order summary without sensitive data';
COMMENT ON VIEW v_kitchen_orders IS 'Kitchen-specific view with only necessary information';