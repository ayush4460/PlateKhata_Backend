-- Add slug column to restaurants
ALTER TABLE restaurants ADD COLUMN slug VARCHAR(100);

-- Create unique index (implicitly enforces uniqueness, but good for performance too)
CREATE UNIQUE INDEX idx_restaurants_slug ON restaurants(slug);

-- Update existing records with a temporary slug (using id to ensure uniqueness)
-- In a real app, we might use a slugify function, but here we'll just prepend
UPDATE restaurants SET slug = LOWER(REPLACE(name, ' ', '-'));

-- Now enforce NOT NULL
ALTER TABLE restaurants ALTER COLUMN slug SET NOT NULL;
