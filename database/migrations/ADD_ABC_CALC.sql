-- Function to Calculate ABC Curve
-- Logic:
-- A: Top 80% of revenue
-- B: Next 15% of revenue
-- C: Bottom 5% of revenue
-- D: No sales

CREATE OR REPLACE FUNCTION calculate_abc_curve()
RETURNS void AS $$
DECLARE
  v_total_revenue DECIMAL;
  v_cumulative_revenue DECIMAL := 0;
  v_revenue DECIMAL;
  r RECORD;
BEGIN
  -- 1. Reset all to 'D' (No Sales)
  UPDATE products SET abc_curve = 'D';

  -- 2. Calculate Total Revenue of last 90 days
  SELECT SUM(total_price) INTO v_total_revenue 
  FROM sale_items si
  JOIN sales s ON si.sale_id = s.id
  WHERE s.created_at >= NOW() - INTERVAL '90 days'
  AND s.status = 'completed';

  IF v_total_revenue IS NULL OR v_total_revenue = 0 THEN
    RETURN; -- No sales, all remain D
  END IF;

  -- 3. Iterate products ordered by revenue (highest first)
  FOR r IN 
    SELECT 
      si.product_id,
      SUM(si.total_price) as revenue
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    WHERE s.created_at >= NOW() - INTERVAL '90 days'
    AND s.status = 'completed'
    GROUP BY si.product_id
    ORDER BY revenue DESC
  LOOP
    v_revenue := r.revenue;
    v_cumulative_revenue := v_cumulative_revenue + v_revenue;
    
    -- Determine Class
    IF v_cumulative_revenue <= (v_total_revenue * 0.8) THEN
      UPDATE products SET abc_curve = 'A' WHERE id = r.product_id;
    ELSIF v_cumulative_revenue <= (v_total_revenue * 0.95) THEN
      UPDATE products SET abc_curve = 'B' WHERE id = r.product_id;
    ELSE
      UPDATE products SET abc_curve = 'C' WHERE id = r.product_id;
    END IF;
    
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_abc_curve IS 'Recalcula a curva ABC dos produtos com base nos últimos 90 dias de vendas';
