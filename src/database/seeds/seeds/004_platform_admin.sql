-- Seed Platform Admin
INSERT INTO platform_admins (username, email, password_hash, full_name, role)
VALUES (
    'Ayush', 
    'ayushgzala@gmail.com', 
    '$2a$10$8K1p/a0dL3.I8.F5.Q5Z7eOYjBY3Z3YZ7eOYjBY3Z3YZ7eOYjBY3Z3Y', 
    'Ayush', 
    'super_admin'
)
ON CONFLICT (email) DO NOTHING;
