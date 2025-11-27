-- ============================================
-- Backup and Data Integrity Functions
-- ============================================

-- Function: Validate data integrity
CREATE OR REPLACE FUNCTION check_data_integrity()
RETURNS TABLE(
    check_name TEXT,
    status TEXT,
    details TEXT
) AS $$
BEGIN
    -- Check 1: Orders without items
    RETURN QUERY
    SELECT 
        'Orders without items'::TEXT as check_name,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END as status,
        'Found ' || COUNT(*) || ' orders without items' as details
    FROM orders o
    LEFT JOIN order_items oi ON o.order_id = oi.order_id
    WHERE oi.order_item_id IS NULL;
    
    -- Check 2: Payments without orders
    RETURN QUERY
    SELECT
        'Payments without orders'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
        'Found ' || COUNT(*) || ' orphaned payments'
    FROM payments p
    LEFT JOIN orders o ON p.order_id = o.order_id
    WHERE o.order_id IS NULL;
    
    -- Check 3: Order total mismatch
    RETURN QUERY
    SELECT 
        'Order total calculation'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
        'Found ' || COUNT(*) || ' orders with incorrect totals'
    FROM orders o
    WHERE ABS(o.subtotal - (
        SELECT COALESCE(SUM(oi.total_price), 0)
        FROM order_items oi
        WHERE oi.order_id = o.order_id
    )) > 0.01;
    
    -- Check 4: Duplicate receipt numbers
    RETURN QUERY
    SELECT 
        'Duplicate receipt numbers'::TEXT,
        CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END,
        'Found ' || COUNT(*) || ' duplicate receipts'
    FROM (
        SELECT receipt_number, COUNT(*) as cnt
        FROM receipts
        GROUP BY receipt_number
        HAVING COUNT(*) > 1
    ) duplicates;
    
END;
$$ LANGUAGE plpgsql;

-- Function: Clean old sessions
CREATE OR REPLACE FUNCTION cleanup_old_sessions(days_old INTEGER DEFAULT 7)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM sessions
    WHERE created_at < CURRENT_TIMESTAMP - (days_old || ' days')::INTERVAL
    AND is_active = FALSE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Archive old orders
CREATE OR REPLACE FUNCTION archive_completed_orders(months_old INTEGER DEFAULT 6)
RETURNS INTEGER AS $$
DECLARE
    archived_count INTEGER;
BEGIN
    -- Create archive table if not exists
    CREATE TABLE IF NOT EXISTS orders_archive (LIKE orders INCLUDING ALL);
    
    -- Move old completed orders to archive
    WITH moved_orders AS (
        DELETE FROM orders
        WHERE order_status = 'completed'
        AND completed_at < CURRENT_TIMESTAMP - (months_old || ' months')::INTERVAL
        RETURNING *
    )
    INSERT INTO orders_archive SELECT * FROM moved_orders;
    
    GET DIAGNOSTICS archived_count = ROW_COUNT;
    
    RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON FUNCTION check_data_integrity IS 'Validates database integrity and consistency';
COMMENT ON FUNCTION cleanup_old_sessions IS 'Removes expired sessions older than specified days';
COMMENT ON FUNCTION archive_completed_orders IS 'Archives old completed orders to improve performance';