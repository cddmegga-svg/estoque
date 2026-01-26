-- Tabela de Sessões de Conferência
CREATE TABLE conference_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('transfer', 'nfe')),
  source_id UUID NOT NULL, -- ID da Transferência ou da NFe
  status VARCHAR(20) NOT NULL CHECK (status IN ('in_progress', 'completed', 'divergent', 'cancelled')) DEFAULT 'in_progress',
  filial_id UUID REFERENCES filiais(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  user_name VARCHAR(255),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP WITH TIME ZONE,
  notes TEXT
);

-- Tabela de Itens da Conferência
CREATE TABLE conference_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conference_id UUID NOT NULL REFERENCES conference_sessions(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  expected_quantity INTEGER NOT NULL, -- Quanto o sistema diz que tem
  scanned_quantity INTEGER NOT NULL DEFAULT 0, -- Quanto o usuário contou
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Índices
CREATE INDEX idx_conference_source ON conference_sessions(source_id);
CREATE INDEX idx_conference_status ON conference_sessions(status);
CREATE INDEX idx_conference_items_conf ON conference_items(conference_id);

COMMENT ON TABLE conference_sessions IS 'Sessões de conferência cega (Entrada/Transferência)';
COMMENT ON TABLE conference_items IS 'Itens conferidos x esperados';
