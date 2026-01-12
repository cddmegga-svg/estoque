-- Adicionar colunas de preço na tabela de produtos
ALTER TABLE products 
ADD COLUMN cost_price DECIMAL(10, 2) DEFAULT 0.00,
ADD COLUMN sale_price DECIMAL(10, 2) DEFAULT 0.00;

COMMENT ON COLUMN products.cost_price IS 'Preço de custo unitário (referência)';
COMMENT ON COLUMN products.sale_price IS 'Preço de venda unitário (tabela/sugerido)';
