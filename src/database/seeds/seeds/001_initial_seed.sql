-- Create default restaurant
INSERT INTO restaurants (name, address, contact_email, is_active, slug)
VALUES ('MuchMate Central', '123 Main St, Tech City', 'contact@muchmate.com', true, 'muchmate-central')
ON CONFLICT (slug) DO NOTHING; -- Assuming ID is serial, this might not work for name. 
-- Better to use a WHERE check or unique constraint on name if it existed, but let's assume this is fresh or we don't care about duplications if name is not unique.
-- Actually, let's just use DO NOTHING or check exists.

-- Since name doesn't have a unique constraint in schema likely, we should be careful.
-- Let's just update the admin user if it exists.

-- Create admin user linked to the restaurant
-- Password hash placeholder matches the one in seed.js
INSERT INTO users (username, email, password_hash, full_name, role, restaurant_id)
VALUES (
    'admin',
    'admin@restaurant.com',
    '$2a$10$8K1p/a0dL3.I8.F5.Q5Z7eOYjBY3Z3YZ7eOYjBY3Z3YZ7eOYjBY3Z3Y',
    'System Administrator',
    'admin',
    (SELECT restaurant_id FROM restaurants WHERE name = 'MuchMate Central' LIMIT 1)
)
ON CONFLICT (username) 
DO UPDATE SET 
    restaurant_id = (SELECT restaurant_id FROM restaurants WHERE name = 'MuchMate Central' LIMIT 1);

-- Create some default tables
INSERT INTO tables (table_number, capacity, restaurant_id)
VALUES 
    ('T1', 4, (SELECT restaurant_id FROM restaurants WHERE name = 'MuchMate Central' LIMIT 1)),
    ('T2', 2, (SELECT restaurant_id FROM restaurants WHERE name = 'MuchMate Central' LIMIT 1)),
    ('T3', 6, (SELECT restaurant_id FROM restaurants WHERE name = 'MuchMate Central' LIMIT 1));

-- Create some default menu items
INSERT INTO menu_items (name, description, category, price, is_vegetarian, restaurant_id)
VALUES 
    ('Butter Chicken', 'Classic rich curry', 'Main Course', 15.99, false, (SELECT restaurant_id FROM restaurants WHERE name = 'MuchMate Central' LIMIT 1)),
    ('Paneer Tikka', 'Grilled cottage cheese', 'Starters', 12.99, true, (SELECT restaurant_id FROM restaurants WHERE name = 'MuchMate Central' LIMIT 1)),
    ('Garlic Naan', 'Indian bread', 'Breads', 3.99, true, (SELECT restaurant_id FROM restaurants WHERE name = 'MuchMate Central' LIMIT 1));
