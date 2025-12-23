-- Seed for Axiom restaurant and users

-- Insert Axiom restaurant (idempotent via slug unique index)
INSERT INTO restaurants (name, address, contact_email, is_active, slug)
VALUES ('Axiom', NULL, 'ayush@axiom.com', true, 'axiom')
ON CONFLICT (slug) DO NOTHING;

-- Insert Admin user for Axiom
INSERT INTO users (username, email, password_hash, full_name, role, restaurant_id)
VALUES (
  'ayush',
  'ayush@axiom.com',
  '$2a$10$8K1p/a0dL3.I8.F5.Q5Z7eOYjBY3Z3YZ7eOYjBY3Z3YZ7eOYjBY3Z3Y',
  'Axiom Administrator',
  'admin',
  (SELECT restaurant_id FROM restaurants WHERE slug = 'axiom' LIMIT 1)
)
ON CONFLICT (email) DO UPDATE SET
  restaurant_id = (SELECT restaurant_id FROM restaurants WHERE slug = 'axiom' LIMIT 1),
  role = EXCLUDED.role;

-- Insert Kitchen user for Axiom
INSERT INTO users (username, email, password_hash, full_name, role, restaurant_id)
VALUES (
  'pushpa',
  'pushpa@axiom.com',
  '$2a$10$8K1p/a0dL3.I8.F5.Q5Z7eOYjBY3Z3YZ7eOYjBY3Z3YZ7eOYjBY3Z3Y',
  'Axiom Kitchen',
  'kitchen',
  (SELECT restaurant_id FROM restaurants WHERE slug = 'axiom' LIMIT 1)
)
ON CONFLICT (email) DO UPDATE SET
  restaurant_id = (SELECT restaurant_id FROM restaurants WHERE slug = 'axiom' LIMIT 1),
  role = EXCLUDED.role;

-- Optional: confirm presence by inserting a default table for the restaurant (idempotent)
INSERT INTO tables (table_number, capacity, restaurant_id)
VALUES ('A1', 4, (SELECT restaurant_id FROM restaurants WHERE slug = 'axiom' LIMIT 1))
ON CONFLICT DO NOTHING;
