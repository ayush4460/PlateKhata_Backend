-- Add dietary_type column for better categorization (veg, non_veg, eggitarian)
ALTER TABLE menu_items ADD COLUMN IF NOT EXISTS dietary_type VARCHAR(20) DEFAULT ('non_veg');

-- Backfill existing data based on is_vegetarian flag if needed
-- Assuming is_vegetarian=true -> 'veg', false -> 'non_veg'
UPDATE menu_items SET dietary_type = 'veg' WHERE is_vegetarian = true;
UPDATE menu_items SET dietary_type = 'non_veg' WHERE is_vegetarian = false;
