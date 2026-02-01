-- SECURITY UPDATE: ENABLE COMPREHENSIVE RLS
-- Fixes "RLS Disabled" warnings from Supabase Advisor.
-- Strategy: Enable RLS on all tables and allow "authenticated" users full access.
-- This prevents Anonymous/Public API access while maintaining current functionality for logged-in users.

-- 1. Enable RLS on all tables
ALTER TABLE IF EXISTS filiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS products ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sale_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS sale_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS purchase_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cash_registers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS cash_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS accounts_payable ENABLE ROW LEVEL SECURITY;

-- 2. Create "Allow All Authenticated" Policies
-- We drop existing policies to avoid conflicts if re-run.

DO $$
DECLARE
    t text;
    tables text[] := ARRAY[
        'filiais', 'products', 'stock_items', 'sales', 'sale_items', 'sale_payments', 
        'employees', 'customers', 'suppliers', 'purchase_requests', 
        'cash_registers', 'cash_movements', 'movements', 'accounts_payable'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        -- Check if table exists before creating policy
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
            EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated users full access" ON %I', t);
            EXECUTE format('CREATE POLICY "Allow authenticated users full access" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t);
        END IF;
    END LOOP;
END $$;

-- 3. Verify Functions (Security Definer)
-- If we had custom functions, we would inspect them here.
-- Currently, no insecure custom functions were detected in migrations.

-- End of Security Patch
