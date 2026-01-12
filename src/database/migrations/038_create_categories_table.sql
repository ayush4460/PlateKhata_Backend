-- ============================================
-- Migration: Create Categories Table
-- Description: Creates categories table and links it to menu_items
-- ============================================

-- 1. Create categories table
CREATE TABLE IF NOT EXISTS categories (
    category_id SERIAL PRIMARY KEY,
    restaurant_id INTEGER REFERENCES restaurants(restaurant_id),
    name VARCHAR(100) NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(restaurant_id, name)
);

-- 2. Add category_id to menu_items
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menu_items' AND column_name = 'category_id') THEN
        ALTER TABLE menu_items ADD COLUMN category_id INTEGER REFERENCES categories(category_id);
    END IF;
END $$;

-- 3. Backfill categories from existing menu_items (Idempotent)
INSERT INTO categories (restaurant_id, name)
SELECT DISTINCT restaurant_id, category 
FROM menu_items 
WHERE category IS NOT NULL
ON CONFLICT (restaurant_id, name) DO NOTHING;

-- 4. Link menu_items to categories
UPDATE menu_items m
SET category_id = c.category_id
FROM categories c
WHERE m.restaurant_id = c.restaurant_id 
AND m.category = c.name
AND m.category_id IS NULL;
