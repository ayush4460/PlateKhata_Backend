-- Add updated_at column to item_customizations to support ON CONFLICT updates
ALTER TABLE item_customizations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
