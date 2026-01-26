-- Add Max Discount Field to Products
ALTER TABLE products ADD COLUMN IF NOT EXISTS max_discount_percent DECIMAL(5,2) DEFAULT 0;

-- Update Comments
COMMENT ON COLUMN products.max_discount_percent IS 'Percentual mÃ¡ximo de desconto permitido sem senha de gerente';
