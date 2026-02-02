-- SAAS MIGRATION V1: MULTI-TENANCY FOUNDATION
-- 1. Creates 'tenants' table.
-- 2. Creates a Default Tenant (ID: 0000...0000) for existing data.
-- 3. Adds 'tenant_id' column to all core tables, defaulting to the Default Tenant.
-- This ensures existing data remains accessible while preparing the DB for multiple clients.

-- 1. Create Tenants Table
CREATE TABLE IF NOT EXISTS tenants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    document TEXT, -- CNPJ/CPF
    plan_status TEXT DEFAULT 'active', -- active, trial, suspended
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    settings JSONB DEFAULT '{}'::jsonb -- For logo, primary_color, etc.
);

-- Enable RLS on tenants
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- 2. Insert Default Tenant (Your current operation)
-- We use a fixed UUID for the "Legacy/Matrix" tenant to easily map existing rows.
INSERT INTO tenants (id, name, plan_status)
VALUES ('00000000-0000-0000-0000-000000000000', 'Minha Farmácia (Matriz)', 'active')
ON CONFLICT (id) DO NOTHING;

-- 3. Add tenant_id to all tables
DO $$
DECLARE
    -- List of tables to migrate
    tables text[] := ARRAY[
        'filiais', 
        'products', 
        'stock_items', 
        'sales', 
        'sale_items', 
        'sale_payments', 
        'employees', 
        'customers', 
        'suppliers', 
        'purchase_requests', 
        'cash_registers', 
        'cash_movements', 
        'movements', 
        'accounts_payable'
    ];
    t text;
BEGIN
    FOREACH t IN ARRAY tables LOOP
        -- Add column if not exists
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
            EXECUTE format('ALTER TABLE %I ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT ''00000000-0000-0000-0000-000000000000'' REFERENCES tenants(id)', t);
            
            -- Create Index for performance (Multi-tenant queries always filter by tenant_id)
            EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_tenant_id ON %I(tenant_id)', t, t);
        END IF;
    END LOOP;
END $$;

-- 4. Create Policy Helper Function
-- Allows us to get the current user's tenant_id securely
CREATE OR REPLACE FUNCTION get_current_tenant_id() RETURNS UUID AS $$
BEGIN
    -- Ideally, we read this from a custom claim or user_metadata.
    -- For now, if no claim is present, we fallback to the Default Tenant (Matrix).
    -- This allows the existing app to keep working without changes.
    RETURN COALESCE(
        (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid,
        '00000000-0000-0000-0000-000000000000'::uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Update RLS Policies (Example Template - Applied to tenants for now)
-- Allow users to read ONLY their own tenant
DROP POLICY IF EXISTS "Tenant Isolation Policy" ON tenants;
CREATE POLICY "Tenant Isolation Policy" ON tenants
    FOR ALL
    TO authenticated
    USING (id = get_current_tenant_id());

-- Note: We will update the policies of other tables in V2, 
-- once we confirm the backend is sending the tenant_id or limits are effective.
