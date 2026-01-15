-- Create Purchase Requests / Encomendas table
CREATE TABLE IF NOT EXISTS purchase_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id), -- Quem solicitou (funcionário)
    user_name TEXT, -- Nome do funcionário cacheado p/ facilidade
    client_name TEXT NOT NULL,
    client_contact TEXT,
    item_description TEXT NOT NULL,
    priority TEXT CHECK (priority IN ('normal', 'urgent')) DEFAULT 'normal',
    status TEXT CHECK (status IN ('pending', 'ordered', 'arrived', 'picked_up', 'cancelled')) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS Policies
ALTER TABLE purchase_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for authenticated users"
ON purchase_requests FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Enable insert access for authenticated users"
ON purchase_requests FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Enable update access for authenticated users"
ON purchase_requests FOR UPDATE
TO authenticated
USING (true);

CREATE POLICY "Enable delete access for authenticated users"
ON purchase_requests FOR DELETE
TO authenticated
USING (true);
