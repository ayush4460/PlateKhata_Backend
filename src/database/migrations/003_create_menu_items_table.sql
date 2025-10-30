-- ============================================
-- Menu Items Table
-- Security: Input validation, XSS prevention
-- ============================================

CREATE TABLE IF NOT EXISTS menu_items (
    item_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    image_url VARCHAR(255),
    is_available BOOLEAN DEFAULT TRUE,
    is_vegetarian BOOLEAN DEFAULT FALSE,
    is_vegan BOOLEAN DEFAULT FALSE,
    is_gluten_free BOOLEAN DEFAULT FALSE,
    spice_level VARCHAR(20),
    preparation_time INTEGER,
    calories INTEGER,
    allergens TEXT[],
    ingredients TEXT[],
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Security Constraints
    CONSTRAINT category_valid CHECK (category IN (
        'Beverages', 'Starters', 'Main Course', 'Desserts', 
        'Breads', 'Specials', 'Salads', 'Soups', 'Appetizers'
    )),
    CONSTRAINT price_positive CHECK (price > 0 AND price < 100000),
    CONSTRAINT preparation_time_valid CHECK (preparation_time IS NULL OR (preparation_time > 0 AND preparation_time <= 180)),
    CONSTRAINT spice_level_valid CHECK (spice_level IS NULL OR spice_level IN ('Mild', 'Medium', 'Hot', 'Extra Hot')),
    CONSTRAINT name_min_length CHECK (LENGTH(TRIM(name)) >= 2)
);

-- Indexes for performance
CREATE INDEX idx_menu_category ON menu_items(category);
CREATE INDEX idx_menu_availability ON menu_items(is_available);
CREATE INDEX idx_menu_vegetarian ON menu_items(is_vegetarian);
CREATE INDEX idx_menu_display_order ON menu_items(display_order);
CREATE INDEX idx_menu_price ON menu_items(price);

-- Full-text search index for menu search
CREATE INDEX idx_menu_search ON menu_items USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Trigger to auto-update updated_at
CREATE TRIGGER update_menu_items_updated_at
    BEFORE UPDATE ON menu_items
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment
COMMENT ON TABLE menu_items IS 'Restaurant menu items with detailed nutritional and dietary information';
COMMENT ON COLUMN menu_items.allergens IS 'Array of allergen information (e.g., {nuts, dairy, gluten})';
COMMENT ON COLUMN menu_items.display_order IS 'Order in which items appear in menu (lower numbers first)';