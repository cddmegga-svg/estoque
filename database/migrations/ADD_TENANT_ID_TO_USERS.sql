-- Migration: ADD_TENANT_ID_TO_USERS
-- Description: Adds tenant_id to users to support RLS and multi-tenancy.
-- This was missing from the initial SaaS rollouts.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name = 'tenant_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.users ADD COLUMN tenant_id UUID REFERENCES public.tenants(id);
        RAISE NOTICE 'Added tenant_id to users table.';
    ELSE
        RAISE NOTICE 'tenant_id already exists on users table.';
    END IF;
END $$;
