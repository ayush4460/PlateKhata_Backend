-- ============================================
-- Migration: Create Customization Tables
-- Description: Adds tables for customization groups, options, and item linkages with price overrides.
-- ============================================

-- 1. Create customization_groups table
CREATE TABLE IF NOT EXISTS customization_groups (
    group_id SERIAL PRIMARY KEY,
    restaurant_id INTEGER NOT NULL REFERENCES restaurants(restaurant_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    min_selection INTEGER DEFAULT 0,
    max_selection INTEGER DEFAULT 1,
    is_required BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Create customization_options table
CREATE TABLE IF NOT EXISTS customization_options (
    option_id SERIAL PRIMARY KEY,
    group_id INTEGER NOT NULL REFERENCES customization_groups(group_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create item_customizations table (Link Menu Item <-> Group)
CREATE TABLE IF NOT EXISTS item_customizations (
    item_customization_id SERIAL PRIMARY KEY,
    item_id INTEGER NOT NULL REFERENCES menu_items(item_id) ON DELETE CASCADE,
    group_id INTEGER NOT NULL REFERENCES customization_groups(group_id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    is_required BOOLEAN DEFAULT FALSE, -- Override group default if needed, or just sync
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(item_id, group_id)
);

-- 4. Create item_customization_options table (Price Overrides)
CREATE TABLE IF NOT EXISTS item_customization_options (
    item_customization_option_id SERIAL PRIMARY KEY,
    item_customization_id INTEGER NOT NULL REFERENCES item_customizations(item_customization_id) ON DELETE CASCADE,
    option_id INTEGER NOT NULL REFERENCES customization_options(option_id) ON DELETE CASCADE,
    price_modifier DECIMAL(10, 2) DEFAULT 0.00, -- Specific price for this option on this item
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(item_customization_id, option_id)
);

-- Indexes for performance
CREATE INDEX idx_cg_restaurant ON customization_groups(restaurant_id);
CREATE INDEX idx_co_group ON customization_options(group_id);
CREATE INDEX idx_ic_item ON item_customizations(item_id);
CREATE INDEX idx_ico_ic ON item_customization_options(item_customization_id);
