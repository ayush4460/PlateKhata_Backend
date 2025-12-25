-- Drop the legacy check constraint that restricts category names
ALTER TABLE menu_items DROP CONSTRAINT IF EXISTS category_valid;
