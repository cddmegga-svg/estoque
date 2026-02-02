-- DEBUG RLS SCRIPT
-- Run this in Supabase SQL Editor to verify what's happening.

-- 1. Check if the function returns the expected Legacy ID (should be 00000....)
SELECT get_current_tenant_id() as current_tenant_debug;

-- 2. Check how many products exist in total
SELECT count(*) as total_products_in_db FROM products;

-- 3. Check how many products are visible to YOU (Simulating RLS)
-- Note: In the SQL Editor you are "postgres" (superuser) so RLS is bypassed by default.
-- To test RLS, we just check the tenant_id distribution.
SELECT tenant_id, count(*) FROM products GROUP BY tenant_id;

-- 4. Check if the "0000" tenant exists
SELECT * FROM tenants WHERE id = '00000000-0000-0000-0000-000000000000';

-- 5. Hard Reset (If needed)
-- Uncomment the line below to disable RLS on products temporarily if you are blocked.
-- ALTER TABLE products DISABLE ROW LEVEL SECURITY;
