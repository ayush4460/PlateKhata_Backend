-- Add payment_method column to orders
ALTER TABLE orders 
ADD COLUMN payment_method VARCHAR(50); -- Allow nullable for pending orders

-- Add check constraint for valid methods if we want strictness, or just leave as varchar for flexibility
-- CONSTRAINT payment_method_valid CHECK (payment_method IN ('cash', 'card', 'online', 'upi', 'wallet'))
-- Let's stick to simple VARCHAR for now to avoid migration issues with existing data.
