-- Add ca_email column to restaurants table
ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS ca_email VARCHAR(255);
