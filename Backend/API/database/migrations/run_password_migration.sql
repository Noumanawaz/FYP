-- Quick migration script to add password_hash column
-- Run this directly in your Neon database console or via psql

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

