-- ============================================
-- Security Functions - Input validation and sanitization
-- ============================================

-- Function: Sanitize text input (prevent XSS)
CREATE OR REPLACE FUNCTION sanitize_text(input_text TEXT)
RETURNS TEXT AS $$
BEGIN
    IF input_text IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Remove HTML tags
    input_text := regexp_replace(input_text, '<[^>]+>', '', 'g');
    
    -- Remove script tags content
    input_text := regexp_replace(input_text, '<script[^>]*>.*?</script>', '', 'gi');
    
    -- Trim whitespace
    input_text := TRIM(input_text);
    
    RETURN input_text;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Validate email format
CREATE OR REPLACE FUNCTION is_valid_email(email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Validate phone number (Indian format)
CREATE OR REPLACE FUNCTION is_valid_phone(phone TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN phone ~* '^(\+91|0)?[6-9][0-9]{9}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function: Calculate order total securely
CREATE OR REPLACE FUNCTION calculate_order_total(p_order_id INTEGER)
RETURNS TABLE(
    subtotal DECIMAL(10,2),
    tax_amount DECIMAL(10,2),
    total_amount DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(oi.total_price), 0) as subtotal,
        COALESCE(SUM(oi.total_price), 0) * 0.05 as tax_amount,
        COALESCE(SUM(oi.total_price), 0) * 1.05 as total_amount
    FROM order_items oi
    WHERE oi.order_id = p_order_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Get order statistics (for admin dashboard)
CREATE OR REPLACE FUNCTION get_order_statistics(
    p_start_date DATE DEFAULT CURRENT_DATE,
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
    total_orders BIGINT,
    completed_orders BIGINT,
    cancelled_orders BIGINT,
    total_revenue DECIMAL(10,2),
    average_order_value DECIMAL(10,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total_orders,
        COUNT(*) FILTER (WHERE order_status = 'completed') as completed_orders,
        COUNT(*) FILTER (WHERE order_status = 'cancelled') as cancelled_orders,
        COALESCE(SUM(total_amount) FILTER (WHERE order_status = 'completed'), 0) as total_revenue,
        COALESCE(AVG(total_amount) FILTER (WHERE order_status = 'completed'), 0) as average_order_value
    FROM orders
    WHERE DATE(created_at) BETWEEN p_start_date AND p_end_date;
END;
$$ LANGUAGE plpgsql STABLE;

-- Function: Check if table is available
CREATE OR REPLACE FUNCTION is_table_available(p_table_id INTEGER)
RETURNS BOOLEAN AS $$
DECLARE
    v_available BOOLEAN;
BEGIN
    SELECT is_available AND is_active
    INTO v_available
    FROM tables
    WHERE table_id = p_table_id;
    
    RETURN COALESCE(v_available, FALSE);
END;
$$ LANGUAGE plpgsql STABLE;

-- Add comments
COMMENT ON FUNCTION sanitize_text IS 'Removes HTML and script tags to prevent XSS attacks';
COMMENT ON FUNCTION is_valid_email IS 'Validates email format using regex';
COMMENT ON FUNCTION calculate_order_total IS 'Securely calculates order totals with tax';