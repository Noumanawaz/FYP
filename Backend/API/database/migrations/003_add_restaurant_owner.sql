-- Migration: Add restaurant owner_id to restaurants table
-- This enables restaurant ownership tracking for RBAC

-- Add owner_id column to restaurants table
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES users(user_id) ON DELETE SET NULL;

-- Create index for faster owner lookups
CREATE INDEX IF NOT EXISTS idx_restaurants_owner_id ON restaurants(owner_id);

-- Add comment
COMMENT ON COLUMN restaurants.owner_id IS 'UUID of the restaurant owner (restaurant_owner role user)';

