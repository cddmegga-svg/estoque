-- Migration: FIX_SUPER_ADMIN_ACCOUNT
-- Description: Manually links the nexfarmapro@gmail.com auth user to a valid tenant/user profile.
-- Usage: Run this to unblock the Super Admin login if the UI registration failed but Auth User exists.

DO $$
DECLARE
    v_user_id UUID;
    v_tenant_id UUID;
    v_filial_id UUID;
BEGIN
    -- 1. Find the Auth User (The one stuck in limbo)
    SELECT id INTO v_user_id FROM auth.users WHERE email = 'nexfarmapro@gmail.com';
    
    IF v_user_id IS NULL THEN
        RAISE NOTICE 'Atenção: O usuário nexfarmapro@gmail.com não existe no Auth. Crie a conta primeiro.';
        RETURN;
    END IF;

    RAISE NOTICE 'Found Auth User: %', v_user_id;

    -- 2. Check or Create the Tenant (NexFarma Admin)
    SELECT id INTO v_tenant_id FROM tenants WHERE document = 'CNPJ_ADMIN_001';
    
    IF v_tenant_id IS NULL THEN
        INSERT INTO tenants (name, document, plan_status, settings)
        VALUES ('NexFarma Admin', 'CNPJ_ADMIN_001', 'active', '{"primary_color": "#0f172a"}'::jsonb)
        RETURNING id INTO v_tenant_id;
        
        -- Create default Matriz for this Admin Tenant
        INSERT INTO filiais (name, cnpj, address, type, tenant_id)
        VALUES ('Sede Administrativa', 'CNPJ_ADMIN_001', 'Nuvem', 'store', v_tenant_id)
        RETURNING id INTO v_filial_id;
    ELSE
        SELECT id INTO v_filial_id FROM filiais WHERE tenant_id = v_tenant_id LIMIT 1;
    END IF;

    -- 3. Create or Fix the Public User Profile
    -- This inserts the missing row in public.users
    INSERT INTO users (id, name, email, role, filial_id, tenant_id, permissions)
    VALUES (
        v_user_id,
        'Super Admin',
        'nexfarmapro@gmail.com',
        'admin',
        v_filial_id,
        v_tenant_id,
        ARRAY['admin_access', 'super_admin', 'manage_users', 'manage_stock', 'view_financial', 'view_reports']
    )
    ON CONFLICT (id) DO UPDATE SET
        role = 'admin',
        tenant_id = v_tenant_id, -- Force link to Admin Tenant
        filial_id = v_filial_id,
        permissions = ARRAY['admin_access', 'super_admin', 'manage_users', 'manage_stock', 'view_financial', 'view_reports'];

    -- 4. Update Auth Metadata (Crucial for RLS)
    UPDATE auth.users
    SET raw_app_meta_data = 
        COALESCE(raw_app_meta_data, '{}'::jsonb) || 
        jsonb_build_object('tenant_id', v_tenant_id)
    WHERE id = v_user_id;

    RAISE NOTICE 'Super Admin Fixed! Try logging in now.';
END;
$$;
