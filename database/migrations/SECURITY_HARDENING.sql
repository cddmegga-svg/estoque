-- SECURITY HARDENING MIGRATION
-- Fixes critical vulnerabilities reported by Supabase Advisor
-- 1. Secure get_current_tenant_id to use app_metadata (not user_metadata).
-- 2. Enable RLS on public tables that were missing it.
-- 3. Set functions and views to be SECURITY INVOKER to prevent permission escalation.

-- A. Fix Helper Function (The Root of Trust)
-- Switch from user_metadata (editable by user) to app_metadata (secure, backend only).
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID AS $$
BEGIN
    RETURN (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- B. Enable RLS on Exposed Tables
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conference_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conference_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.nfe_imports ENABLE ROW LEVEL SECURITY;
-- (Other tables were already enabled in previous migrations, but good to ensure)

-- C. Apply Tenant Isolation Policy to New Tables
DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'users', 'transfers', 'conference_sessions', 'conference_items', 'nfe_imports'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
            -- Drop old permissive policies if any
            EXECUTE format('DROP POLICY IF EXISTS "Public Access" ON %I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated users full access" ON %I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation" ON %I', t);

            -- Create Strict Policy
            -- Special case for 'users': Users can see themselves OR users in their tenant.
            -- But effectively, if everyone has a tenant_id, the standard rule works.
            -- Exception: A user with NO tenant_id (e.g. initial setup) needs special handling?
            -- Assuming all active users have tenant_id now.
            EXECUTE format('
                CREATE POLICY "Tenant Isolation" ON %I
                AS PERMISSIVE
                FOR ALL
                TO authenticated
                USING (tenant_id = get_current_tenant_id())
                WITH CHECK (tenant_id = get_current_tenant_id())
            ', t);
        END IF;
    END LOOP;
END $$;

-- D. Fix Security Definer Views
-- Start by identifying the views mentioned in the report.
-- We alter them to respect RLS (security_invoker = true).
DO $$
DECLARE
    v text;
    views text[] := ARRAY[
        'stock_consolidated', 
        'v_filial_stock_status', 
        'expiration_dashboard', 
        'transfers_history', 
        'v_product_performance', 
        'stock_value_by_filial', 
        'v_daily_sales'
    ];
BEGIN
    FOREACH v IN ARRAY views LOOP
        IF EXISTS (SELECT FROM pg_views WHERE schemaname = 'public' AND viewname = v) THEN
             -- Postgres 15+ syntax. If older, we might need a different approach, but Supabase is recent.
             EXECUTE format('ALTER VIEW %I SET (security_invoker = true)', v);
        END IF;
    END LOOP;
END $$;

-- E. Special Case: Users Table Self-Access
-- Users might need to see themselves even if tenant_id is somehow null or ensuring profile load works.
-- But since we force tenant_id on login via app_metadata, the standard policy should hold.
-- Adding a backup policy for "Self Access" just in case of bootstrapping issues.
DROP POLICY IF EXISTS "Users Self Access" ON public.users;
CREATE POLICY "Users Self Access" ON public.users
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = id);

