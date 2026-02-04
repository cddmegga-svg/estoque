-- MIGRATION: SUPER ADMIN FEATURES
-- 1. Add 'features' column to tenants for module management
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenants' AND column_name = 'features') THEN
        ALTER TABLE tenants ADD COLUMN features JSONB DEFAULT '{}'::jsonb;
    END IF;
END $$;

-- 2. Create/Update RPC to get ALL tenants (Super Admin Only)
CREATE OR REPLACE FUNCTION saas_get_all_tenants()
RETURNS TABLE (
    id UUID,
    name TEXT,
    cnpj TEXT,
    plan_status TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    logo_url TEXT,
    features JSONB,
    users_count BIGINT
) 
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges to bypass RLS
SET search_path = public -- Security best practice
AS $$
DECLARE
    current_user_email TEXT;
    current_user_role TEXT;
BEGIN
    -- Security Check: Only specific users/roles can access this
    current_user_email := auth.jwt() ->> 'email';
    current_user_role := auth.jwt() -> 'user_metadata' ->> 'role';

    -- HARDCODED SECURITY LIST OR ROLE CHECK
    -- Modify this list with your actual Super Admin email(s)
    IF current_user_role <> 'super_admin' AND current_user_email NOT IN ('nexfarmapro@gmail.com') THEN
        RAISE EXCEPTION 'Acesso Negado: Apenas Super Admins podem acessar esta função.';
    END IF;

    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.cnpj,
        t.plan_status,
        t.created_at,
        t.logo_url,
        t.features,
        (SELECT COUNT(*) FROM users u WHERE u.tenant_id = t.id) as users_count
    FROM tenants t
    ORDER BY t.created_at DESC;
END;
$$;

-- 3. Create/Update RPC to Toggle Status
CREATE OR REPLACE FUNCTION saas_toggle_tenant_status(
    p_tenant_id UUID,
    p_status TEXT -- 'active', 'suspended', 'inactive'
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_email TEXT;
BEGIN
    current_user_email := auth.jwt() ->> 'email';
    
    -- Security Check
    IF current_user_email NOT IN ('admin@nexfarmapro.com', 'suporte@cddmegga.com.br') AND (auth.jwt() -> 'user_metadata' ->> 'role') <> 'super_admin' THEN
        RAISE EXCEPTION 'Acesso Negado.';
    END IF;

    UPDATE tenants 
    SET plan_status = p_status 
    WHERE id = p_tenant_id;
END;
$$;

-- 4. Create/Update RPC to Update Features
CREATE OR REPLACE FUNCTION saas_update_tenant_features(
    p_tenant_id UUID,
    p_features JSONB
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_email TEXT;
BEGIN
    current_user_email := auth.jwt() ->> 'email';
    
    -- Security Check
    IF current_user_email NOT IN ('admin@nexfarmapro.com', 'suporte@cddmegga.com.br') AND (auth.jwt() -> 'user_metadata' ->> 'role') <> 'super_admin' THEN
        RAISE EXCEPTION 'Acesso Negado.';
    END IF;

    UPDATE tenants 
    SET features = p_features 
    WHERE id = p_tenant_id;
END;
$$;
