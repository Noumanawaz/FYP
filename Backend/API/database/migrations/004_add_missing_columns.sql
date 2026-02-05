-- Migration 004: Add missing columns to match Swagger documentation
-- This ensures all fields shown in Swagger can be stored in the database

-- ====== USERS TABLE ======
-- Add role column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'role'
    ) THEN
        ALTER TABLE users 
        ADD COLUMN role VARCHAR(20) DEFAULT 'customer' 
        CHECK (role IN ('customer', 'restaurant_owner', 'admin'));
        
        CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    END IF;
END $$;

-- ====== RESTAURANTS TABLE ======
-- Add owner_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'restaurants' AND column_name = 'owner_id'
    ) THEN
        ALTER TABLE restaurants 
        ADD COLUMN owner_id UUID REFERENCES users(user_id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_restaurants_owner_id ON restaurants(owner_id);
    END IF;
END $$;

-- ====== MENU ITEMS TABLE ======
-- Ensure all fields from Swagger exist (they should already be there, but verify)
-- No changes needed - all fields match

-- ====== MENU CATEGORIES TABLE ======
-- Ensure all fields from Swagger exist (they should already be there, but verify)
-- No changes needed - all fields match

-- ====== ORDERS TABLE ======
-- Verify all fields exist (they should already be there)
-- No changes needed - all fields match

