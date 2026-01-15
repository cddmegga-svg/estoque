-- Rename old constraint if needed or drop and recreate
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add new constraint with expanded roles
ALTER TABLE users ADD CONSTRAINT users_role_check 
CHECK (role IN ('admin', 'manager', 'sales', 'cashier', 'stock', 'viewer'));

COMMENT ON COLUMN users.role IS 'admin: Total access | manager: SNGPC/Inventory | sales: Pre-sales | cashier: POS | stock: Logistics | viewer: Read-only';
