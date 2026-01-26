-- View: Stock Status per Filial
-- Determines if a product is Overstocked or Understocked in a specific branch

CREATE OR REPLACE VIEW v_filial_stock_status AS
WITH filial_sales AS (
  -- Calculate Sales Velocity per Filial (Last 30 days)
  SELECT 
    s.filial_id,
    si.product_id,
    COALESCE(SUM(si.quantity), 0) / 30.0 as avg_daily_sales
  FROM sale_items si
  JOIN sales s ON si.sale_id = s.id
  WHERE s.created_at >= NOW() - INTERVAL '30 days'
  GROUP BY s.filial_id, si.product_id
),
filial_stock AS (
  -- Current Stock per Filial
  SELECT 
    si.filial_id,
    si.product_id,
    SUM(si.quantity) as current_qty
  FROM stock_items si
  GROUP BY si.filial_id, si.product_id
)
SELECT 
  fs.filial_id,
  f.name as filial_name,
  fs.product_id,
  p.name as product_name,
  fs.current_qty,
  COALESCE(vel.avg_daily_sales, 0) as velocity,
  p.min_stock,
  p.max_stock,
  -- Status Logic
  CASE
    WHEN fs.current_qty <= COALESCE(p.min_stock, 0) THEN 'LOW' -- Below Min
    WHEN vel.avg_daily_sales > 0 AND fs.current_qty < (vel.avg_daily_sales * 7) THEN 'LOW' -- Less than 7 days coverage
    WHEN p.max_stock > 0 AND fs.current_qty > p.max_stock THEN 'HIGH' -- Above Max
    WHEN vel.avg_daily_sales > 0 AND fs.current_qty > (vel.avg_daily_sales * 45) THEN 'HIGH' -- More than 45 days coverage
    ELSE 'OK'
  END as status
FROM filial_stock fs
JOIN filiais f ON fs.filial_id = f.id
JOIN products p ON fs.product_id = p.id
LEFT JOIN filial_sales vel ON fs.filial_id = vel.filial_id AND fs.product_id = vel.product_id
WHERE fs.current_qty > 0 OR p.min_stock > 0; -- Filter relevant items
