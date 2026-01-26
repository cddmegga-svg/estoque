-- Add employee_id to sales if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='sales' AND column_name='employee_id') THEN
        ALTER TABLE sales ADD COLUMN employee_id UUID REFERENCES employees(id);
    END IF;
END $$;
