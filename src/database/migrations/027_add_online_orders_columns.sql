-- Add columns for online orders integration
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS external_platform VARCHAR(50), 
ADD COLUMN IF NOT EXISTS external_order_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS dyno_order_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS raw_status VARCHAR(50);

-- Add columns for restaurant mappings
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS zomato_restaurant_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS swiggy_restaurant_id VARCHAR(255);

-- Allow table_id to be null for online orders
ALTER TABLE orders ALTER COLUMN table_id DROP NOT NULL;

-- Ensure uniqueness for external orders to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_external_id ON orders(external_order_id, external_platform);
