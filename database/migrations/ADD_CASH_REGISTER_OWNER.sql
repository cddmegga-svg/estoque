-- Add opening_employee_id to cash_registers to track who owns the session
ALTER TABLE cash_registers ADD COLUMN IF NOT EXISTS opening_employee_id UUID REFERENCES employees(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_cash_registers_opening_employee ON cash_registers(opening_employee_id);
