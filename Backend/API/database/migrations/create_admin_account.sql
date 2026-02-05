-- Script to create admin account
-- Email: admin@vocabite.com
-- Password: 123321
-- Role: admin

-- First, ensure password_hash column exists
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Ensure role column exists with proper constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'customer' CHECK (role IN ('customer', 'restaurant_owner', 'admin'));
    END IF;
END $$;

-- Create or update admin account
-- Using bcrypt hash for password '123321' (salt rounds: 10)
-- Hash: $2a$10$rK8qJ8qJ8qJ8qJ8qJ8qJ8u (this is a placeholder - we'll use Node.js to generate the actual hash)
INSERT INTO users (
    email,
    name,
    role,
    preferred_language,
    password_hash,
    created_at,
    last_active_at
)
VALUES (
    'admin@vocabite.com',
    'System Administrator',
    'admin',
    'en',
    '$2a$10$rK8qJ8qJ8qJ8qJ8qJ8qJ8u', -- Placeholder - will be replaced by Node.js script
    NOW(),
    NOW()
)
ON CONFLICT (email) 
DO UPDATE SET
    role = 'admin',
    password_hash = EXCLUDED.password_hash,
    name = 'System Administrator',
    last_active_at = NOW();

-- Note: The actual password hash should be generated using bcrypt in Node.js
-- Run the create_admin.js script instead for proper password hashing

