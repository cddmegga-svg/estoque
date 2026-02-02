-- FIX SCRIPT: FORCE DATA TO DEFAULT TENANT
-- Run this if your data "disappeared" after the SaaS migration.
-- It forces all existing records to belong to the "Minha Farmácia (Matriz)" tenant.

DO $$
DECLARE
    -- The Fixed ID of the Matrix Lease
    default_tenant_id UUID := '00000000-0000-0000-0000-000000000000';
    
    tables text[] := ARRAY[
        'filiais', 'products', 'stock_items', 'sales', 'sale_items', 'sale_payments', 
        'employees', 'customers', 'suppliers', 'purchase_requests', 'cash_registers', 
        'cash_movements', 'movements', 'accounts_payable'
    ];
    t text;
BEGIN
    -- 1. Ensure the Tenant Exists (Just in case)
    INSERT INTO tenants (id, name, plan_status)
    VALUES (default_tenant_id, 'Minha Farmácia (Matriz)', 'active')
    ON CONFLICT (id) DO NOTHING;

    -- 2. Update all tables
    FOREACH t IN ARRAY tables LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
            
            -- Force update all rows that have NULL tenant_id
            EXECUTE format('UPDATE %I SET tenant_id = %L WHERE tenant_id IS NULL', t, default_tenant_id);
            
            -- Optional: Force update ALL rows if you want to be properly sure (since you shouldn't have other data yet)
            -- EXECUTE format('UPDATE %I SET tenant_id = %L', t, default_tenant_id);
            
            RAISE NOTICE 'Updated table %', t;
        END IF;
    END LOOP;
END $$;
