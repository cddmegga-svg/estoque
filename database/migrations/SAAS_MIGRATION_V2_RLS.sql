-- SAAS MIGRATION V2: ENFORCING ISOLATION (RLS)
-- This script activates the "SaaS Security Layer".
-- 1. Sets the default value of 'tenant_id' to automatically grab the current user's tenant.
-- 2. Drops old "permissive" policies.
-- 3. Creates strict "Tenant-Only" policies for all tables.

-- A. Helper: List of tables to secure
-- (We repeat this list to ensure we cover everything)
DO $$
DECLARE
    tables text[] := ARRAY[
        'filiais', 'products', 'stock_items', 'sales', 'sale_items', 'sale_payments', 
        'employees', 'customers', 'suppliers', 'purchase_requests', 'cash_registers', 
        'cash_movements', 'movements', 'accounts_payable'
    ];
    t text;
BEGIN
    FOREACH t IN ARRAY tables LOOP
        
        -- Check if table exists before tampering
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN

            -- 1. Set Dynamic Default
            -- Now, when you insert a row WITHOUT specifying tenant_id, it auto-fills relevant to the user.
            EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET DEFAULT get_current_tenant_id()', t);

            -- 2. Enable RLS (Just in case)
            EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

            -- 3. DROP OLD POLICIES (Clean Slate)
            -- We try to drop common names to avoid conflicts
            EXECUTE format('DROP POLICY IF EXISTS "Enable read access for all users" ON %I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Enable insert access for all users" ON %I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Enable update access for all users" ON %I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Enable delete access for all users" ON %I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Public Access" ON %I', t);

            -- 4. CREATE NEW STRICT POLICY
            -- "User can only SEE and MODIFY rows where tenant_id matches their own."
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

-- B. Special Case: Employees Table
-- Employees might need to read their own profile even if somehow tenant logic is weird, 
-- but generally the above loop covers it. 
-- However, we must ensure the "auth.users" link is respected.
-- (The generic loop works, but let's double check RLS disabled warning)
-- Done in V1.

-- C. Verification Query
-- You can run this to check if policies exist:
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public';
