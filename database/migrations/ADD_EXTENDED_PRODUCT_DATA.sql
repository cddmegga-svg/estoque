-- Add Manufacturing Date to Stock Items
ALTER TABLE stock_items ADD COLUMN IF NOT EXISTS manufacturing_date DATE;

-- Add Smart Pricing & Tax fields to Products
ALTER TABLE products ADD COLUMN IF NOT EXISTS profit_margin DECIMAL(5,2) DEFAULT 30.00;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_cfop TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_icms DECIMAL(5,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_pis DECIMAL(5,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_cofins DECIMAL(5,2);
ALTER TABLE products ADD COLUMN IF NOT EXISTS tax_ipi DECIMAL(5,2);

-- Update existing products to have default margin if null
UPDATE products SET profit_margin = 30.00 WHERE profit_margin IS NULL;
