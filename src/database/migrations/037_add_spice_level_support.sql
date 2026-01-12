-- ============================================
-- Migration: Add Spice Level Support
-- Description: Adds has_spice_levels to menu_items and spice_level to order_items
-- ============================================

-- 1. Add has_spice_levels to menu_items
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'menu_items' AND column_name = 'has_spice_levels') THEN
        ALTER TABLE menu_items ADD COLUMN has_spice_levels BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- 2. Add spice_level to order_items
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'order_items' AND column_name = 'spice_level') THEN
        ALTER TABLE order_items ADD COLUMN spice_level VARCHAR(50) DEFAULT NULL;
    END IF;
END $$;
