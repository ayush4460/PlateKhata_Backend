-- ============================================
-- Notification System using PostgreSQL LISTEN/NOTIFY
-- Real-time notifications for order updates
-- ============================================

-- Function: Notify new order
CREATE OR REPLACE FUNCTION notify_new_order()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM pg_notify(
        'new_order',
        json_build_object(
            'order_id', NEW.order_id,
            'table_id', NEW.table_id,
            'order_number', NEW.order_number,
            'total_amount', NEW.total_amount,
            'created_at', NEW.created_at
        )::text
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Notify order status change
CREATE OR REPLACE FUNCTION notify_order_status_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.order_status IS DISTINCT FROM NEW.order_status THEN
        PERFORM pg_notify(
            'order_status_change',
            json_build_object(
                'order_id', NEW.order_id,
                'table_id', NEW.table_id,
                'old_status', OLD.order_status,
                'new_status', NEW.order_status,
                'updated_at', NEW.updated_at
            )::text
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Notify payment completed
CREATE OR REPLACE FUNCTION notify_payment_completed()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.payment_status = 'completed' AND OLD.payment_status != 'completed' THEN
        PERFORM pg_notify(
            'payment_completed',
            json_build_object(
                'payment_id', NEW.payment_id,
                'order_id', NEW.order_id,
                'amount', NEW.amount,
                'payment_method', NEW.payment_method,
                'paid_at', NEW.paid_at
            )::text
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER trigger_notify_new_order
    AFTER INSERT ON orders
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_order();

CREATE TRIGGER trigger_notify_order_status_change
    AFTER UPDATE ON orders
    FOR EACH ROW
    EXECUTE FUNCTION notify_order_status_change();

CREATE TRIGGER trigger_notify_payment_completed
    AFTER UPDATE ON payments
    FOR EACH ROW
    EXECUTE FUNCTION notify_payment_completed();

-- Add comments
COMMENT ON FUNCTION notify_new_order IS 'Sends real-time notification when new order is created';
COMMENT ON FUNCTION notify_order_status_change IS 'Notifies status changes for real-time updates';