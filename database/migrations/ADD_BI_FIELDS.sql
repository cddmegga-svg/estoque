-- Adicionar colunas de Inteligência de Negócio na tabela de produtos

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS abc_curve CHAR(1) CHECK (abc_curve IN ('A', 'B', 'C', 'D')),
ADD COLUMN IF NOT EXISTS pmc_price DECIMAL(10, 2), -- Preço Máximo ao Consumidor (Tabela Revista)
ADD COLUMN IF NOT EXISTS max_stock INTEGER; -- Estoque Máximo (Para sugestão de compra)

COMMENT ON COLUMN products.abc_curve IS 'Classificação Curva ABC (A=80% Faturamento)';
COMMENT ON COLUMN products.pmc_price IS 'Preço Máximo ao Consumidor (Referência Farmácia)';

-- Index para relatórios rápidos
CREATE INDEX IF NOT EXISTS idx_products_abc ON products(abc_curve);

-- View para Relatório de Vendas por Dia
CREATE OR REPLACE VIEW v_daily_sales AS
SELECT 
  DATE(created_at) as sale_date,
  COUNT(*) as total_sales,
  SUM(total_value) as total_revenue,
  SUM(discount_value) as total_discount,
  AVG(total_value) as ticket_average
FROM sales
WHERE status = 'completed'
GROUP BY DATE(created_at);

-- View para Performance de Produto (Curva ABC base)
CREATE OR REPLACE VIEW v_product_performance AS
SELECT 
  p.id,
  p.name,
  p.abc_curve,
  SUM(si.quantity) as total_sold_qty,
  SUM(si.total_price) as total_sold_revenue
FROM products p
LEFT JOIN sale_items si ON p.id = si.product_id
LEFT JOIN sales s ON si.sale_id = s.id
WHERE s.status = 'completed'
GROUP BY p.id, p.name, p.abc_curve;
