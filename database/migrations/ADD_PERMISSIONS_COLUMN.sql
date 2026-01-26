-- Add permissions column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions text[] DEFAULT '{}';

-- Update existing users to have default permissions based on role (Migration logic)
UPDATE users SET permissions = ARRAY['view_dashboard', 'view_products'] WHERE role = 'viewer';
UPDATE users SET permissions = ARRAY['view_dashboard', 'view_products', 'create_sale', 'view_customers'] WHERE role = 'sales' OR role = 'cashier';
UPDATE users SET permissions = ARRAY['view_dashboard', 'view_products', 'manage_stock', 'view_transfers', 'create_transfer'] WHERE role = 'stock';
UPDATE users SET permissions = ARRAY['view_dashboard', 'view_products', 'create_sale', 'view_customers', 'manage_stock', 'view_transfers', 'create_transfer', 'view_reports', 'manage_users'] WHERE role = 'manager';
UPDATE users SET permissions = ARRAY['view_dashboard', 'view_products', 'create_sale', 'view_customers', 'manage_stock', 'view_transfers', 'create_transfer', 'view_reports', 'manage_users', 'view_financial', 'manage_financial', 'admin_access'] WHERE role = 'admin';
