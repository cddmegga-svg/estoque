-- Migration: Soft Delete for Users
-- Description: Add active column to users table to allow "deleting" users without breaking FK constraints (Sales, Cash Registers).

ALTER TABLE users ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE;

-- Update existing users to be active
UPDATE users SET active = TRUE WHERE active IS NULL;

-- Create policy or view adjustments if necessary (RLS usually filters this, but for now we filter in API)
