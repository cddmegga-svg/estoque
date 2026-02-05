-- Migration: ADD_PIN_TO_USERS
-- Description: Adds a PIN column to the users table to allow Owners to have a quick access code
-- similar to employees (useful for POS unlock and admin confirmation).

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'pin'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN pin TEXT;
        RAISE NOTICE 'Added pin column to users table.';
    ELSE
        RAISE NOTICE 'pin column already exists on users table.';
    END IF;
END $$;
