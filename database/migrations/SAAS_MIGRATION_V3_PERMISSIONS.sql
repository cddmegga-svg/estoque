-- SAAS MIGRATION V3: EMPLOYEE PERMISSIONS
-- Moves the source of truth for "What I can do" from the Login (User) to the Team Member (Employee).

-- 1. Add Permissions Column to Employees
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '[]'::jsonb;

-- 2. Add Role Column to Employees (if not exists, usually it does)
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'operator';

-- 3. Sync Logic (Optional Initial Population)
-- If we want to copy permissions from the USER to the EMPLOYEE linked to them.
-- Assuming 'users' table has a 'filial_id' or some link, but here we don't have a direct link yet 
-- except maybe by email if stored. 
-- For now, we Initialize everyone as 'basic' to be safe, or 'admin' if role is admin.

UPDATE employees 
SET permissions = '["access_pos", "create_sale"]'::jsonb 
WHERE role = 'operator' AND permissions = '[]'::jsonb;

UPDATE employees 
SET permissions = '["access_pos", "create_sale", "manage_stock", "view_reports", "manage_users"]'::jsonb 
WHERE role = 'manager' AND permissions = '[]'::jsonb;

UPDATE employees 
SET permissions = '["admin_access", "access_pos", "create_sale", "manage_stock", "view_reports", "manage_users", "manage_suppliers", "view_financial"]'::jsonb 
WHERE role = 'admin' AND permissions = '[]'::jsonb;

-- 4. Create Helper to Get Employee Permissions by PIN (Future Use)
-- When user types PIN, we fetch these permissions.
