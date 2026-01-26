-- Seed Employees
-- Filial ID needs to be valid. We assume the first filial.
DO $$
DECLARE
    v_filial_id UUID;
BEGIN
    SELECT id INTO v_filial_id FROM filiais LIMIT 1;

    IF v_filial_id IS NOT NULL THEN
        -- Admin User
        INSERT INTO employees (name, role, pin, filial_id)
        VALUES ('Admin', 'manager', '999999', v_filial_id)
        ON CONFLICT (pin) DO NOTHING;

        -- Cashier User
        INSERT INTO employees (name, role, pin, filial_id)
        VALUES ('Caixa 01', 'cashier', '123456', v_filial_id)
        ON CONFLICT (pin) DO NOTHING;
        
        -- Salesperson User
        INSERT INTO employees (name, role, pin, filial_id)
        VALUES ('Vendedor 01', 'salesperson', '111111', v_filial_id)
        ON CONFLICT (pin) DO NOTHING;
    END IF;
END $$;
