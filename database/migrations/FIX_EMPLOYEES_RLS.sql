-- Enable RLS on employees
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;

-- Policy to allow authenticated users to read employees (for PIN check)
CREATE POLICY "Enable read access for authenticated users" ON employees
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy to allow authenticated users to insert/update employees (Admin/Manager usage)
CREATE POLICY "Enable all access for authenticated users" ON employees
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Ensure the employees exist (Retry Seed just in case, ensuring no duplicates)
DO $$
DECLARE
    v_filial_id UUID;
BEGIN
    SELECT id INTO v_filial_id FROM filiais LIMIT 1;
    
    IF v_filial_id IS NOT NULL THEN
        -- Re-insert if deleted or missing
        INSERT INTO employees (name, role, pin, filial_id)
        VALUES ('Admin', 'manager', '999999', v_filial_id)
        ON CONFLICT (pin) DO NOTHING;

        INSERT INTO employees (name, role, pin, filial_id)
        VALUES ('Caixa 01', 'cashier', '123456', v_filial_id)
        ON CONFLICT (pin) DO NOTHING;
    END IF;
END $$;
