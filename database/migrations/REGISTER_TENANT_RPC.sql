-- Function: register_new_tenant
-- Description: Handles the onboarding of a new pharmacy (SaaS).
-- 1. Creates the Tenant.
-- 2. Links the creating User (from Auth) to this Tenant.
-- 3. Updates the User's app_metadata to include tenant_id (for RLS).
-- 4. Creates a default 'store' Filial for the tenant.

CREATE OR REPLACE FUNCTION register_new_tenant(
    p_company_name TEXT,
    p_document TEXT, -- CNPJ
    p_user_email TEXT,
    p_user_name TEXT,
    p_user_id UUID -- Passed explicitly or we can use auth.uid()
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
    -- We assume the user already exists in auth.users (signed up via client).
    -- We insert into public.users.
    INSERT INTO users (id, name, email, role, filial_id, tenant_id, permissions)
    VALUES (
        p_user_id, 
        p_user_name, 
        p_user_email, 
        'admin', 
        v_filial_id, 
        v_tenant_id, 
        ARRAY['admin_access']
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        filial_id = EXCLUDED.filial_id,
        tenant_id = EXCLUDED.tenant_id,
        permissions = EXCLUDED.permissions;

    -- 4. Update Auth Metadata (The Magic Step for RLS)
    -- This requires permissions to alter auth.users. 
    -- SECURITY DEFINER should allow this if the function owner is postgres/supabase_admin.
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
