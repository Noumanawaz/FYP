-- Migration: Add password_hash column to users table
-- Date: 2025-12-02

-- Add password_hash column to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Add index for faster lookups (though we'll primarily search by email/phone)
-- Note: We don't index password_hash as it's not used for lookups

