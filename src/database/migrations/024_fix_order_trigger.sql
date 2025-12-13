-- Redefine the function to use dynamic tax rate from the order record
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
        -- Use the applied_tax_rate from the order row itself, default to 0 if missing.
        -- We calculate tax_amount based on the NEW subtotal and the EXISTING or NEW rate.
        tax_amount = (
            SELECT COALESCE(SUM(total_price), 0) 
            FROM order_items 
            WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
        ) * COALESCE(applied_tax_rate, 0.05),
        
        -- Recalculate total logic
        total_amount = (
            SELECT COALESCE(SUM(total_price), 0) FROM order_items WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
        ) 
        + 
        ((
            SELECT COALESCE(SUM(total_price), 0) FROM order_items WHERE order_id = COALESCE(NEW.order_id, OLD.order_id)
        ) * COALESCE(applied_tax_rate, 0.05))
        - 
        COALESCE(discount_amount, 0)
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
