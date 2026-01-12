-- ============================================================================
-- FarmaControl - Esquema Completo do Banco de Dados
-- Sistema de Gestão de Estoque Farmacêutico
-- ============================================================================

-- ============================================================================
-- PARTE 1: CRIAÇÃO DAS TABELAS
-- ============================================================================

-- Tabela: Filiais
CREATE TABLE filiais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18) UNIQUE NOT NULL,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para filiais
CREATE INDEX idx_filiais_cnpj ON filiais(cnpj);

COMMENT ON TABLE filiais IS 'Cadastro das filiais da rede de farmácias';
COMMENT ON COLUMN filiais.cnpj IS 'CNPJ no formato 00.000.000/0000-00';


-- Tabela: Usuários
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'viewer')),
  filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para users
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_filial ON users(filial_id);
CREATE INDEX idx_users_role ON users(role);

COMMENT ON TABLE users IS 'Usuários do sistema com controle de permissões';
COMMENT ON COLUMN users.role IS 'admin: pode fazer transferências | viewer: apenas consulta';


-- Tabela: Produtos
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  active_ingredient VARCHAR(255) NOT NULL,
  manufacturer VARCHAR(255) NOT NULL,
  ean VARCHAR(13) UNIQUE NOT NULL,
  ncm VARCHAR(8) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para products
CREATE INDEX idx_products_ean ON products(ean);
CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_active_ingredient ON products(active_ingredient);

COMMENT ON TABLE products IS 'Cadastro de produtos farmacêuticos';
COMMENT ON COLUMN products.ean IS 'Código de barras EAN-13';
COMMENT ON COLUMN products.ncm IS 'Nomenclatura Comum do Mercosul';


-- Tabela: Itens de Estoque
CREATE TABLE stock_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE CASCADE,
  lote VARCHAR(50) NOT NULL,
  expiration_date DATE NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity >= 0),
  unit_price DECIMAL(10, 2) NOT NULL CHECK (unit_price >= 0),
  entry_date DATE NOT NULL,
  nfe_number VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraint para evitar duplicação de lotes na mesma filial
  UNIQUE(product_id, filial_id, lote)
);

-- Índices para stock_items
CREATE INDEX idx_stock_product ON stock_items(product_id);
CREATE INDEX idx_stock_filial ON stock_items(filial_id);
CREATE INDEX idx_stock_expiration ON stock_items(expiration_date);
CREATE INDEX idx_stock_lote ON stock_items(lote);
CREATE INDEX idx_stock_quantity ON stock_items(quantity);

COMMENT ON TABLE stock_items IS 'Itens de estoque por filial, lote e validade';
COMMENT ON COLUMN stock_items.expiration_date IS 'Data de validade do lote';
COMMENT ON COLUMN stock_items.quantity IS 'Quantidade disponível em estoque';


-- Tabela: Transferências
CREATE TABLE transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  from_filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE CASCADE,
  to_filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE CASCADE,
  lote VARCHAR(50) NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  transfer_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'completed', 'cancelled')) DEFAULT 'completed',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  
  -- Constraint para evitar transferência da mesma filial para ela mesma
  CHECK (from_filial_id != to_filial_id)
);

-- Índices para transfers
CREATE INDEX idx_transfers_from_filial ON transfers(from_filial_id);
CREATE INDEX idx_transfers_to_filial ON transfers(to_filial_id);
CREATE INDEX idx_transfers_date ON transfers(transfer_date);
CREATE INDEX idx_transfers_product ON transfers(product_id);
CREATE INDEX idx_transfers_user ON transfers(user_id);
CREATE INDEX idx_transfers_status ON transfers(status);

COMMENT ON TABLE transfers IS 'Histórico de transferências entre filiais';
COMMENT ON COLUMN transfers.status IS 'pending: aguardando | completed: concluída | cancelled: cancelada';


-- Tabela: Movimentações
CREATE TABLE movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE CASCADE,
  lote VARCHAR(50) NOT NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('entry', 'exit', 'transfer_in', 'transfer_out')),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(255) NOT NULL,
  notes TEXT,
  nfe_number VARCHAR(20),
  transfer_id UUID REFERENCES transfers(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para movements
CREATE INDEX idx_movements_filial ON movements(filial_id);
CREATE INDEX idx_movements_product ON movements(product_id);
CREATE INDEX idx_movements_date ON movements(date);
CREATE INDEX idx_movements_type ON movements(type);
CREATE INDEX idx_movements_transfer ON movements(transfer_id);

COMMENT ON TABLE movements IS 'Registro de todas as movimentações de estoque';
COMMENT ON COLUMN movements.type IS 'entry: entrada | exit: saída | transfer_in: recebimento | transfer_out: envio';


-- Tabela: Importações de NFe
CREATE TABLE nfe_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nfe_number VARCHAR(20) NOT NULL,
  nfe_date DATE NOT NULL,
  supplier VARCHAR(255) NOT NULL,
  cnpj VARCHAR(18) NOT NULL,
  filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  xml_file_path TEXT,
  status VARCHAR(20) NOT NULL CHECK (status IN ('imported', 'validated', 'rejected')) DEFAULT 'imported',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices para nfe_imports
CREATE INDEX idx_nfe_number ON nfe_imports(nfe_number);
CREATE INDEX idx_nfe_filial ON nfe_imports(filial_id);
CREATE INDEX idx_nfe_date ON nfe_imports(nfe_date);
CREATE INDEX idx_nfe_status ON nfe_imports(status);

COMMENT ON TABLE nfe_imports IS 'Histórico de importações de Notas Fiscais Eletrônicas';
COMMENT ON COLUMN nfe_imports.status IS 'imported: importada | validated: validada | rejected: rejeitada';


-- ============================================================================
-- PARTE 2: TRIGGERS E FUNCTIONS
-- ============================================================================

-- Function: Atualizar campo updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS 'Trigger function para atualizar automaticamente o campo updated_at';

-- Aplicar trigger em todas as tabelas relevantes
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_filiais_updated_at 
  BEFORE UPDATE ON filiais
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at 
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stock_items_updated_at 
  BEFORE UPDATE ON stock_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transfers_updated_at 
  BEFORE UPDATE ON transfers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nfe_imports_updated_at 
  BEFORE UPDATE ON nfe_imports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- Function: Processar Transferência entre Filiais
CREATE OR REPLACE FUNCTION process_transfer(
  p_product_id UUID,
  p_from_filial_id UUID,
  p_to_filial_id UUID,
  p_lote VARCHAR,
  p_quantity INTEGER,
  p_user_id UUID,
  p_user_name VARCHAR,
  p_notes TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_transfer_id UUID;
  v_stock_item_id UUID;
  v_expiration_date DATE;
  v_unit_price DECIMAL;
  v_existing_stock_id UUID;
  v_from_filial_name VARCHAR;
  v_to_filial_name VARCHAR;
BEGIN
  -- Validar filiais diferentes
  IF p_from_filial_id = p_to_filial_id THEN
    RAISE EXCEPTION 'Não é possível transferir para a mesma filial';
  END IF;

  -- Buscar nomes das filiais
  SELECT name INTO v_from_filial_name FROM filiais WHERE id = p_from_filial_id;
  SELECT name INTO v_to_filial_name FROM filiais WHERE id = p_to_filial_id;

  -- Buscar item de estoque de origem
  SELECT id, expiration_date, unit_price
  INTO v_stock_item_id, v_expiration_date, v_unit_price
  FROM stock_items
  WHERE product_id = p_product_id
    AND filial_id = p_from_filial_id
    AND lote = p_lote
    AND quantity >= p_quantity;

  IF v_stock_item_id IS NULL THEN
    RAISE EXCEPTION 'Estoque insuficiente ou lote não encontrado';
  END IF;

  -- Criar registro de transferência
  INSERT INTO transfers (
    product_id, from_filial_id, to_filial_id, lote, 
    quantity, user_id, user_name, status, notes
  )
  VALUES (
    p_product_id, p_from_filial_id, p_to_filial_id, p_lote,
    p_quantity, p_user_id, p_user_name, 'completed', p_notes
  )
  RETURNING id INTO v_transfer_id;

  -- Atualizar estoque de origem
  UPDATE stock_items
  SET quantity = quantity - p_quantity
  WHERE id = v_stock_item_id;

  -- Verificar se já existe item na filial de destino
  SELECT id INTO v_existing_stock_id
  FROM stock_items
  WHERE product_id = p_product_id
    AND filial_id = p_to_filial_id
    AND lote = p_lote;

  IF v_existing_stock_id IS NOT NULL THEN
    -- Atualizar estoque existente
    UPDATE stock_items
    SET quantity = quantity + p_quantity
    WHERE id = v_existing_stock_id;
  ELSE
    -- Criar novo item de estoque
    INSERT INTO stock_items (
      product_id, filial_id, lote, expiration_date,
      quantity, unit_price, entry_date
    )
    VALUES (
      p_product_id, p_to_filial_id, p_lote, v_expiration_date,
      p_quantity, v_unit_price, CURRENT_DATE
    );
  END IF;

  -- Registrar movimentação de saída
  INSERT INTO movements (
    product_id, filial_id, lote, type, quantity,
    user_id, user_name, transfer_id, notes
  )
  VALUES (
    p_product_id, p_from_filial_id, p_lote, 'transfer_out', p_quantity,
    p_user_id, p_user_name, v_transfer_id, 
    'Transferência enviada para ' || v_to_filial_name
  );

  -- Registrar movimentação de entrada
  INSERT INTO movements (
    product_id, filial_id, lote, type, quantity,
    user_id, user_name, transfer_id, notes
  )
  VALUES (
    p_product_id, p_to_filial_id, p_lote, 'transfer_in', p_quantity,
    p_user_id, p_user_name, v_transfer_id, 
    'Transferência recebida de ' || v_from_filial_name
  );

  RETURN v_transfer_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION process_transfer IS 'Processa uma transferência completa entre filiais incluindo atualização de estoque e movimentações';


-- Function: Buscar Produtos Próximos ao Vencimento
CREATE OR REPLACE FUNCTION get_expiring_products(months_threshold INTEGER DEFAULT 6)
RETURNS TABLE (
  id UUID,
  product_id UUID,
  product_name VARCHAR,
  active_ingredient VARCHAR,
  filial_id UUID,
  filial_name VARCHAR,
  lote VARCHAR,
  expiration_date DATE,
  quantity INTEGER,
  days_to_expire INTEGER,
  unit_price DECIMAL,
  total_value DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    si.id,
    si.product_id,
    p.name AS product_name,
    p.active_ingredient,
    si.filial_id,
    f.name AS filial_name,
    si.lote,
    si.expiration_date,
    si.quantity,
    (si.expiration_date - CURRENT_DATE) AS days_to_expire,
    si.unit_price,
    (si.quantity * si.unit_price) AS total_value
  FROM stock_items si
  INNER JOIN products p ON si.product_id = p.id
  INNER JOIN filiais f ON si.filial_id = f.id
  WHERE si.expiration_date <= CURRENT_DATE + (months_threshold || ' months')::INTERVAL
    AND si.expiration_date >= CURRENT_DATE
    AND si.quantity > 0
  ORDER BY si.expiration_date ASC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_expiring_products IS 'Retorna produtos próximos ao vencimento (padrão: 6 meses)';


-- Function: Obter Valor Total do Estoque por Filial
CREATE OR REPLACE FUNCTION get_stock_value_by_filial(p_filial_id UUID DEFAULT NULL)
RETURNS TABLE (
  filial_id UUID,
  filial_name VARCHAR,
  total_products BIGINT,
  total_items BIGINT,
  total_value DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    f.id AS filial_id,
    f.name AS filial_name,
    COUNT(DISTINCT si.product_id) AS total_products,
    COALESCE(SUM(si.quantity), 0) AS total_items,
    COALESCE(SUM(si.quantity * si.unit_price), 0) AS total_value
  FROM filiais f
  LEFT JOIN stock_items si ON f.id = si.filial_id
  WHERE p_filial_id IS NULL OR f.id = p_filial_id
  GROUP BY f.id, f.name
  ORDER BY f.name;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_stock_value_by_filial IS 'Retorna o valor total do estoque por filial';


-- ============================================================================
-- PARTE 3: VIEWS
-- ============================================================================

-- View: Valor Total do Estoque por Filial
CREATE VIEW stock_value_by_filial AS
SELECT 
  f.id AS filial_id,
  f.name AS filial_name,
  COUNT(DISTINCT si.product_id) AS total_products,
  COALESCE(SUM(si.quantity), 0) AS total_items,
  COALESCE(SUM(si.quantity * si.unit_price), 0) AS total_value
FROM filiais f
LEFT JOIN stock_items si ON f.id = si.filial_id
GROUP BY f.id, f.name;

COMMENT ON VIEW stock_value_by_filial IS 'Resumo do valor do estoque por filial';


-- View: Dashboard de Vencimentos
CREATE VIEW expiration_dashboard AS
SELECT 
  f.id AS filial_id,
  f.name AS filial_name,
  COUNT(CASE WHEN si.expiration_date < CURRENT_DATE THEN 1 END) AS expired_count,
  COUNT(CASE WHEN si.expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '6 months' THEN 1 END) AS expiring_soon_count,
  COALESCE(SUM(CASE WHEN si.expiration_date < CURRENT_DATE THEN si.quantity * si.unit_price ELSE 0 END), 0) AS expired_value,
  COALESCE(SUM(CASE WHEN si.expiration_date BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '6 months' THEN si.quantity * si.unit_price ELSE 0 END), 0) AS expiring_soon_value
FROM filiais f
LEFT JOIN stock_items si ON f.id = si.filial_id
GROUP BY f.id, f.name;

COMMENT ON VIEW expiration_dashboard IS 'Dashboard com contadores de produtos vencidos e próximos ao vencimento';


-- View: Histórico Completo de Transferências
CREATE VIEW transfers_history AS
SELECT 
  t.id,
  t.transfer_date,
  p.name AS product_name,
  p.active_ingredient,
  t.lote,
  t.quantity,
  f_from.name AS from_filial,
  f_to.name AS to_filial,
  t.user_name,
  t.status,
  t.notes,
  (SELECT quantity * unit_price FROM stock_items WHERE product_id = t.product_id AND lote = t.lote LIMIT 1) AS estimated_value
FROM transfers t
INNER JOIN products p ON t.product_id = p.id
INNER JOIN filiais f_from ON t.from_filial_id = f_from.id
INNER JOIN filiais f_to ON t.to_filial_id = f_to.id
ORDER BY t.transfer_date DESC;

COMMENT ON VIEW transfers_history IS 'Histórico completo de transferências com informações detalhadas';


-- View: Estoque Consolidado
CREATE VIEW stock_consolidated AS
SELECT 
  p.id AS product_id,
  p.name AS product_name,
  p.active_ingredient,
  p.manufacturer,
  p.ean,
  f.id AS filial_id,
  f.name AS filial_name,
  si.lote,
  si.expiration_date,
  si.quantity,
  si.unit_price,
  (si.quantity * si.unit_price) AS total_value,
  CASE
    WHEN si.expiration_date < CURRENT_DATE THEN 'expired'
    WHEN si.expiration_date <= CURRENT_DATE + INTERVAL '6 months' THEN 'expiring_soon'
    ELSE 'valid'
  END AS expiration_status,
  (si.expiration_date - CURRENT_DATE) AS days_to_expire
FROM stock_items si
INNER JOIN products p ON si.product_id = p.id
INNER JOIN filiais f ON si.filial_id = f.id
WHERE si.quantity > 0
ORDER BY f.name, p.name, si.expiration_date;

COMMENT ON VIEW stock_consolidated IS 'Visão consolidada do estoque com status de validade';


-- ============================================================================
-- PARTE 4: ROW LEVEL SECURITY (RLS) - Opcional
-- ============================================================================

-- NOTA: Habilite RLS apenas se estiver usando autenticação Supabase/PostgreSQL
-- Descomente as seções abaixo se necessário

/*
-- Habilitar RLS nas tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE filiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE nfe_imports ENABLE ROW LEVEL SECURITY;

-- Políticas para USERS
CREATE POLICY "Users can view all users"
  ON users FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert users"
  ON users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can update users"
  ON users FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can delete users"
  ON users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Políticas para FILIAIS
CREATE POLICY "Everyone can view filiais"
  ON filiais FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage filiais"
  ON filiais FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Políticas para PRODUCTS
CREATE POLICY "Everyone can view products"
  ON products FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage products"
  ON products FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Políticas para STOCK_ITEMS
CREATE POLICY "Everyone can view stock"
  ON stock_items FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage stock"
  ON stock_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Políticas para TRANSFERS
CREATE POLICY "Everyone can view transfers"
  ON transfers FOR SELECT
  USING (true);

CREATE POLICY "Admins can create transfers"
  ON transfers FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Políticas para MOVEMENTS
CREATE POLICY "Everyone can view movements"
  ON movements FOR SELECT
  USING (true);

CREATE POLICY "Admins can create movements"
  ON movements FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- Políticas para NFE_IMPORTS
CREATE POLICY "Everyone can view nfe imports"
  ON nfe_imports FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage nfe imports"
  ON nfe_imports FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );
*/


-- ============================================================================
-- PARTE 5: DADOS INICIAIS (SEED)
-- ============================================================================

-- Inserir filiais (Usando UUIDs válidos gerados)
INSERT INTO filiais (id, name, cnpj, address) VALUES
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'Filial Centro', '12.345.678/0001-01', 'Rua Principal, 100 - Centro'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'Filial Jardins', '12.345.678/0002-02', 'Av. das Flores, 250 - Jardins'),
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'Filial Shopping', '12.345.678/0003-03', 'Shopping Center, Loja 45 - Zona Sul');

-- Inserir usuários
INSERT INTO users (id, name, email, role, filial_id) VALUES
  -- Filial Centro
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b01', 'Ana Silva', 'ana.centro@farma.com', 'admin', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b02', 'Carlos Santos', 'carlos.centro@farma.com', 'viewer', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
  -- Filial Jardins
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b03', 'Maria Oliveira', 'maria.jardins@farma.com', 'admin', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b04', 'João Pereira', 'joao.jardins@farma.com', 'viewer', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'),
  -- Filial Shopping
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b05', 'Paula Costa', 'paula.shopping@farma.com', 'admin', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'),
  ('b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b06', 'Roberto Lima', 'roberto.shopping@farma.com', 'viewer', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33');

-- Inserir produtos
INSERT INTO products (id, name, active_ingredient, manufacturer, ean, ncm) VALUES
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c01', 'Paracetamol 500mg', 'Paracetamol', 'EMS Pharma', '7891234567890', '30049099'),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c02', 'Dipirona Sódica 500mg', 'Dipirona Sódica', 'Medley', '7891234567891', '30049099'),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c03', 'Amoxicilina 500mg', 'Amoxicilina', 'Neo Química', '7891234567892', '30042019'),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c04', 'Losartana Potássica 50mg', 'Losartana Potássica', 'EMS Pharma', '7891234567893', '30049099'),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c05', 'Omeprazol 20mg', 'Omeprazol', 'Eurofarma', '7891234567894', '30049099');

-- Inserir itens de estoque (exemplos)
-- NOTA: Ajuste as datas de validade conforme necessário
INSERT INTO stock_items (product_id, filial_id, lote, expiration_date, quantity, unit_price, entry_date, nfe_number) VALUES
  -- Filial Centro
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'L001A2024', '2025-05-15', 150, 12.50, '2024-06-15', '000123'),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c02', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'L002B2024', '2025-09-20', 200, 8.90, '2024-07-20', '000124'),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c03', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'L003C2024', '2025-04-10', 80, 25.00, '2024-08-10', '000125'),
  -- Filial Jardins
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c01', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'L001D2024', '2025-11-05', 100, 12.50, '2024-09-05', '000201'),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c04', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'L004E2024', '2025-06-15', 120, 18.50, '2024-09-15', '000202'),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c05', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'L005F2024', '2026-01-01', 90, 22.00, '2024-10-01', '000203'),
  -- Filial Shopping
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c02', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'L002G2024', '2025-03-10', 60, 8.90, '2024-10-10', '000301'),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c03', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'L003H2024', '2025-10-20', 110, 25.00, '2024-10-20', '000302'),
  ('c0eebc99-9c0b-4ef8-bb6d-6bb9bd380c05', 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', 'L005I2024', '2025-05-01', 75, 22.00, '2024-11-01', '000303');


-- ============================================================================
-- FIM DO ESQUEMA
-- ============================================================================

-- Para aplicar este schema:
-- 1. Execute em um banco PostgreSQL: psql -U seu_usuario -d nome_do_banco -f schema.sql
-- 2. Ou use uma ferramenta GUI como pgAdmin, DBeaver, etc.
-- 3. Para Supabase: copie e cole no SQL Editor do painel Supabase

-- Verificação de instalação
SELECT 'Schema FarmaControl instalado com sucesso!' AS status;
SELECT COUNT(*) AS total_filiais FROM filiais;
SELECT COUNT(*) AS total_usuarios FROM users;
SELECT COUNT(*) AS total_produtos FROM products;
SELECT COUNT(*) AS total_estoque FROM stock_items;
