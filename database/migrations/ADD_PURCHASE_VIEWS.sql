-- View para somar estoque total por produto (todas as filiais ou agrupado)
CREATE OR REPLACE VIEW v_total_product_stock AS
SELECT 
  p.id as product_id,
  COALESCE(SUM(si.quantity), 0) as total_stock
FROM products p
LEFT JOIN stock_items si ON p.id = si.product_id
GROUP BY p.id;

-- View para calcular Média de Vendas Diárias (Last 30 Days)
CREATE OR REPLACE VIEW v_sales_velocity AS
SELECT 
  si.product_id,
  COALESCE(SUM(si.quantity), 0) / 30.0 as avg_daily_sales
FROM sale_items si
JOIN sales s ON si.sale_id = s.id
WHERE s.created_at >= NOW() - INTERVAL '30 days'
  AND s.status = 'completed'
GROUP BY si.product_id;

-- View Principal: Sugestões de Compra
CREATE OR REPLACE VIEW v_purchase_suggestions AS
SELECT 
  p.id as product_id,
  p.name,
  p.manufacturer,
  p.min_stock,
  p.max_stock,
  s.total_stock as current_stock,
  COALESCE(v.avg_daily_sales, 0) as avg_daily_sales,
  -- Lógica de Sugestão:
  -- 1. Se tiver Max Stock definido: (Max - Atual)
  -- 2. Se não, baseia na média de venda p/ 15 dias: (Media * 15 - Atual)
  CASE 
    WHEN p.max_stock > 0 THEN GREATEST(0, p.max_stock - s.total_stock)
    WHEN v.avg_daily_sales > 0 THEN GREATEST(0, CEIL((v.avg_daily_sales * 15) - s.total_stock))
    ELSE GREATEST(0, p.min_stock - s.total_stock) -- Fallback para Min Stock
  END as suggested_quantity,
  
  -- Criticidade
  CASE
    WHEN s.total_stock = 0 THEN 'Critico'
    WHEN s.total_stock < p.min_stock THEN 'Alto'
    ELSE 'Normal'
  END as priority
FROM products p
LEFT JOIN v_total_product_stock s ON p.id = s.product_id
LEFT JOIN v_sales_velocity v ON p.id = v.product_id
WHERE 
  (p.max_stock > 0 AND s.total_stock < p.max_stock) OR
  (p.min_stock > 0 AND s.total_stock < p.min_stock) OR
  (v.avg_daily_sales > 0 AND s.total_stock < (v.avg_daily_sales * 7)); -- Alert if stock < 7 days coverage
