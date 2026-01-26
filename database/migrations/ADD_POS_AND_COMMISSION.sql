-- Adicionar Código de Vendedor aos Usuários
ALTER TABLE users ADD COLUMN IF NOT EXISTS employee_code VARCHAR(20) UNIQUE;
COMMENT ON COLUMN users.employee_code IS 'Código/PIN para identificar vendedor em terminal compartilhado';

-- Adicionar Comissão aos Produtos
ALTER TABLE products ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5, 2) DEFAULT 0;
COMMENT ON COLUMN products.commission_rate IS 'Porcentagem de comissão deste produto';

-- Tabela de Caixas (Sessões)
CREATE TABLE IF NOT EXISTS cash_registers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filial_id UUID NOT NULL REFERENCES filiais(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id), -- Quem abriu o caixa
  opening_balance DECIMAL(10, 2) NOT NULL DEFAULT 0,
  closing_balance DECIMAL(10, 2),
  status VARCHAR(20) NOT NULL CHECK (status IN ('open', 'closed')) DEFAULT 'open',
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  closed_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Tabela de Movimentações de Caixa (Sangria/Suprimento)
CREATE TABLE IF NOT EXISTS cash_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cash_register_id UUID NOT NULL REFERENCES cash_registers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id), -- Quem fez a movimentação
  type VARCHAR(20) NOT NULL CHECK (type IN ('supply', 'bleed')), -- Suprimento ou Sangria
  amount DECIMAL(10, 2) NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Atualizar Tabela de Vendas
ALTER TABLE sales ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20) DEFAULT 'pending'; -- pending, paid
ALTER TABLE sales ADD COLUMN IF NOT EXISTS salesperson_id UUID REFERENCES users(id); -- Vendedor (pode ser diferente do user_id que criou se for terminal generico)
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cashier_id UUID REFERENCES users(id); -- Quem recebeu
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cash_register_id UUID REFERENCES cash_registers(id); -- Sessão do caixa

-- Atualizar Itens da Venda para Historico de Comissão
ALTER TABLE sale_items ADD COLUMN IF NOT EXISTS commission_value DECIMAL(10, 2) DEFAULT 0;

-- Índices
CREATE INDEX IF NOT EXISTS idx_users_employee_code ON users(employee_code);
CREATE INDEX IF NOT EXISTS idx_sales_salesperson ON sales(salesperson_id);
CREATE INDEX IF NOT EXISTS idx_sales_payment_status ON sales(payment_status);
CREATE INDEX IF NOT EXISTS idx_cash_registers_status ON cash_registers(status);
