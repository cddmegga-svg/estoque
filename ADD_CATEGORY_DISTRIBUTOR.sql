-- Migration to add Category and Distributor validation fields
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS distributor TEXT;

-- Optional: Create an index for category to speed up filtering
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
