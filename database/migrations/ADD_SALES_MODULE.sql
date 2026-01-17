-- Tabela de Vendas (Cabeçalho)
CREATE TABLE sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name VARCHAR(255),
  customer_cpf VARCHAR(14),
  total_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
  discount_value DECIMAL(10, 2) DEFAULT 0,
  final_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL CHECK (status IN ('open', 'completed', 'cancelled')) DEFAULT 'open',
  payment_method VARCHAR(50), -- din, deb, cred, pix
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(255),
  filial_id UUID REFERENCES filiais(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Itens da Venda
CREATE TABLE sale_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE SET NULL,
  product_name VARCHAR(255) NOT NULL, -- Snapshot do nome
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10, 2) NOT NULL, -- Snapshot do preço
  total_price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_sales_filial ON sales(filial_id);
CREATE INDEX idx_sales_created_at ON sales(created_at);
CREATE INDEX idx_sales_status ON sales(status);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);

-- Trigger para updated_at em sales
CREATE TRIGGER update_sales_updated_at 
  BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE sales IS 'Registro de Pré-Vendas (Balcão)';
COMMENT ON TABLE sale_items IS 'Itens da Pré-Venda';
