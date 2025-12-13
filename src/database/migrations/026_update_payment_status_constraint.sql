ALTER TABLE orders DROP CONSTRAINT payment_status_valid;
ALTER TABLE orders ADD CONSTRAINT payment_status_valid CHECK (payment_status IN (
    'Pending', 'Approved', 'Failed', 'Refunded', 'Requested'
));
