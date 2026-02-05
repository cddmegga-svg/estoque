-- Function: register_new_tenant
-- Description: Handles the onboarding of a new pharmacy (SaaS).
-- UPDATED: Now accepts p_user_pin to set the Owner's PIN.

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
