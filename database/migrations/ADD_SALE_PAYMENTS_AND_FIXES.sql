-- Create sale_payments table for Split Payments
CREATE TABLE IF NOT EXISTS sale_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_id UUID REFERENCES sales(id) ON DELETE CASCADE,
    method VARCHAR(50) NOT NULL, -- 'money', 'credit_card', 'debit_card', 'pix'
    amount DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Ensure opening_employee_id exists in cash_registers (Idempotent check)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cash_registers' AND column_name = 'opening_employee_id') THEN
        ALTER TABLE cash_registers ADD COLUMN opening_employee_id UUID REFERENCES employees(id);
    END IF;
END $$;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_sale_payments_sale_id ON sale_payments(sale_id);
