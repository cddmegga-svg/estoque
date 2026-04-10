-- ==========================================
-- FINAL DEPLOY SCRIPT (ALL PENDING CHANGES)
-- ==========================================
-- Run this entire script in the Supabase SQL Editor to apply:
-- 1. Owner PIN Support (new column)
-- 2. Updated Tenant Registration (with PIN)
-- 3. Security Hardening (RLS & Views)

-- [PART 1] ADD PIN TO USERS TABLE
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

-- [PART 2] UPDATE REGISTER TENANT FUNCTION
CREATE OR REPLACE FUNCTION register_new_tenant(
    p_company_name TEXT,
    p_document TEXT, -- CNPJ
    p_user_email TEXT,
    p_user_name TEXT,
    p_user_id UUID,
    p_user_pin TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
    v_tenant_id UUID;
    v_filial_id UUID;
BEGIN
    -- 1. Create Tenant
    INSERT INTO tenants (name, document, plan_status, settings)
    VALUES (p_company_name, p_document, 'active', '{"primary_color": "#10b981"}'::jsonb)
    RETURNING id INTO v_tenant_id;

    -- 2. Create Initial Filial (Headquarters/Matriz)
    INSERT INTO filiais (name, cnpj, address, type, tenant_id)
    VALUES ('Matriz - ' || p_company_name, p_document, 'Endereço Principal', 'store', v_tenant_id)
    RETURNING id INTO v_filial_id;

    -- 3. Create/Update Public User Profile (Idempotent)
    INSERT INTO users (id, name, email, role, filial_id, tenant_id, permissions, pin)
    VALUES (
        p_user_id, 
        p_user_name, 
        p_user_email, 
        'admin', 
        v_filial_id, 
        v_tenant_id, 
        ARRAY['admin_access', 'manage_users', 'manage_stock', 'view_financial', 'view_reports', 'access_pos'], -- Full Access for Owner
        p_user_pin
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        filial_id = EXCLUDED.filial_id,
        tenant_id = EXCLUDED.tenant_id,
        permissions = EXCLUDED.permissions,
        pin = EXCLUDED.pin; -- Update PIN if provided

    -- 4. Update Auth Metadata (The Magic Step for RLS)
    UPDATE auth.users
    SET raw_app_meta_data = 
        COALESCE(raw_app_meta_data, '{}'::jsonb) || 
        jsonb_build_object('tenant_id', v_tenant_id)
    WHERE id = p_user_id;

    RETURN jsonb_build_object(
        'tenant_id', v_tenant_id,
        'filial_id', v_filial_id,
        'message', 'Tenant registered successfully'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- [PART 3] SECURITY HARDENING & RLS

-- A. Fix Helper Function (Secure Tenant ID)
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
            EXECUTE format('DROP POLICY IF EXISTS "Enable read access for all users" ON %I', t);

            -- Create Strict Policy
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

-- D. Fix Security Definer Views (Make them Security Invoker)
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
             EXECUTE format('ALTER VIEW %I SET (security_invoker = true)', v);
        END IF;
    END LOOP;
END $$;

-- E. Special Case: Users Table Self-Access (Backup Policy)
DROP POLICY IF EXISTS "Users Self Access" ON public.users;
CREATE POLICY "Users Self Access" ON public.users
AS PERMISSIVE
FOR SELECT
TO authenticated
USING (auth.uid() = id);
