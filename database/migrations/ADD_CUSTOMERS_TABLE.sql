-- Create Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    cpf TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    number TEXT,
    district TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Policies (Open for now, similar to other tables)
CREATE POLICY "Enable read access for all users" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Enable insert for authenticated users" ON public.customers FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Enable update for authenticated users" ON public.customers FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Enable delete for authenticated users" ON public.customers FOR DELETE USING (auth.role() = 'authenticated');

-- Link Sales to Customers
-- Check if column exists first to avoid error
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'customer_id') THEN
        ALTER TABLE public.sales ADD COLUMN customer_id UUID REFERENCES public.customers(id);
    END IF;
END $$;
