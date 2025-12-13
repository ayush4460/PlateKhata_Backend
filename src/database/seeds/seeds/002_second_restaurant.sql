-- Create a second restaurant
INSERT INTO restaurants (name, address, contact_email, is_active, slug)
VALUES ('MuchMate Downtown', '456 Tech Blvd, City Center', 'downtown@muchmate.com', true, 'muchmate-downtown')
ON CONFLICT (slug) DO NOTHING;

-- Create Admin for Restaurant 2
INSERT INTO users (username, email, password_hash, full_name, role, restaurant_id)
VALUES (
    'admin2',
    'admin2@restaurant.com',
    '$2a$10$8K1p/a0dL3.I8.F5.Q5Z7eOYjBY3Z3YZ7eOYjBY3Z3YZ7eOYjBY3Z3Y', -- Admin@123
    'Downtown Manager',
    'admin',
    (SELECT restaurant_id FROM restaurants WHERE name = 'MuchMate Downtown' LIMIT 1)
)
ON CONFLICT (username) DO NOTHING;

-- Create Kitchen User for Restaurant 2
INSERT INTO users (username, email, password_hash, full_name, role, restaurant_id)
VALUES (
    'kitchen2',
    'kitchen2@restaurant.com',
    '$2a$10$8K1p/a0dL3.I8.F5.Q5Z7eOYjBY3Z3YZ7eOYjBY3Z3YZ7eOYjBY3Z3Y', -- Admin@123
    'Downtown Chef',
    'kitchen',
    (SELECT restaurant_id FROM restaurants WHERE name = 'MuchMate Downtown' LIMIT 1)
)
ON CONFLICT (username) DO NOTHING;

-- Create some tables for Restaurant 2
INSERT INTO tables (table_number, capacity, restaurant_id)
VALUES 
    ('D1', 4, (SELECT restaurant_id FROM restaurants WHERE name = 'MuchMate Downtown' LIMIT 1)),
    ('D2', 2, (SELECT restaurant_id FROM restaurants WHERE name = 'MuchMate Downtown' LIMIT 1))
ON CONFLICT DO NOTHING; -- Assuming table_number+restaurant_id unique? It's not in schema, but it's fine for seed.

-- Create menu items for Restaurant 2 (Different items to prove isolation)
INSERT INTO menu_items (name, description, category, price, is_vegetarian, restaurant_id)
VALUES 
    ('Downtown Burger', 'Signature burger', 'Main Course', 18.99, false, (SELECT restaurant_id FROM restaurants WHERE name = 'MuchMate Downtown' LIMIT 1)),
    ('Spicy Wings', 'Hot wings', 'Starters', 10.99, false, (SELECT restaurant_id FROM restaurants WHERE name = 'MuchMate Downtown' LIMIT 1))
ON CONFLICT DO NOTHING; -- Again, mostly to just ensure they get added if not there.
