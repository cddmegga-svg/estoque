-- Add customization fields to tenants table
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS logo_url TEXT,
ADD COLUMN IF NOT EXISTS primary_color TEXT DEFAULT '#059669', -- Emerald-600
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT;

-- RPC to update tenant settings (securely)
CREATE OR REPLACE FUNCTION update_tenant_settings(
    p_logo_url TEXT,
    p_primary_color TEXT,
    p_website TEXT,
    p_phone TEXT,
    p_name TEXT
)
RETURNS JSONB AS $$
DECLARE
    v_tenant_id UUID;
    v_updated_tenant JSONB;
BEGIN
    -- Get current tenant
    v_tenant_id := get_current_tenant_id();

    -- Update
    UPDATE tenants
    SET 
        logo_url = COALESCE(p_logo_url, logo_url),
        primary_color = COALESCE(p_primary_color, primary_color),
        website = COALESCE(p_website, website),
        phone = COALESCE(p_website, phone),
        name = COALESCE(p_name, name)
    WHERE id = v_tenant_id
    RETURNING to_jsonb(tenants.*) INTO v_updated_tenant;

    RETURN v_updated_tenant;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
