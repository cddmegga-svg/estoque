-- Create Employees Table
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('salesperson', 'cashier', 'manager')),
    pin VARCHAR(20) UNIQUE NOT NULL, -- Simple PIN for now as requested
    active BOOLEAN DEFAULT true,
    filial_id UUID REFERENCES filiais(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Index for PIN lookup
CREATE INDEX IF NOT EXISTS idx_employees_pin ON employees(pin);

-- Update Sales Table to link to Employees instead of Users (for salesperson/cashier)
-- We keep user_id for the "System User" (Login) but add employee_id for the "Person"
ALTER TABLE sales ADD COLUMN IF NOT EXISTS employee_id UUID REFERENCES employees(id);
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cashier_employee_id UUID REFERENCES employees(id);

-- Drop old salesperson columns if they existed as FKs to users (optional, or just ignore them)
-- ALTER TABLE sales DROP COLUMN salesperson_id; -- Let's keep for backward compat or migration if needed, but new logic will use employee_id

-- Create View or Policy if needed (Skipping for now)
