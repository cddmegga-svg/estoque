-- CONFIGURAÇÃO DO "DONO DA FARMÁCIA" (FINAL)
-- Correção de Tipos:
-- Tabela Employees: permissions é JSONB ('["a","b"]')
-- Tabela Users: permissions é TEXT[] (ARRAY['a','b'])

BEGIN;

-- 1. Atualizar PIN do Admin/Dono existente no cadastro de Funcionários (Employees -> JSONB)
UPDATE employees 
SET 
    pin = '060813', 
    name = 'Administrador (Dono)',
    role = 'manager',
    permissions = '["admin_access", "access_pos", "create_sale", "manage_stock", "view_reports", "manage_users", "manage_suppliers", "view_financial"]'::jsonb
WHERE (role = 'manager' AND name ILIKE '%Admin%') OR (role = 'manager' AND pin = '060813');

-- 2. Garantir que exista pelo menos UM "Dono"
INSERT INTO employees (id, name, role, pin, active, tenant_id, permissions)
SELECT 
    gen_random_uuid(), 
    'Administrador (Dono)', 
    'manager',   
    '060813', 
    true, 
    '00000000-0000-0000-0000-000000000000',
    '["admin_access", "access_pos", "create_sale", "manage_stock", "view_reports", "manage_users", "manage_suppliers", "view_financial"]'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM employees WHERE pin = '060813');


-- 3. "Rebaixar" Login para Quiosque (Users -> TEXT ARRAY)
UPDATE users 
SET 
    role = 'viewer', 
    permissions = ARRAY['create_sale', 'access_pos'] 
WHERE role = 'admin' OR role = 'manager'; 
-- Nota: Alteramos apenas quem era admin/manager para não quebrar outros logins se houver.

COMMIT;
