-- Script de Correção Geral (NCM + Colunas Novas)

-- 1. Aumentar o tamanho do campo NCM para aceitar pontos (ex: 3004.90.99)
ALTER TABLE products ALTER COLUMN ncm TYPE VARCHAR(20);

-- 2. Garantir que as colunas de preço existam (se já existirem, não faz nada)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'cost_price') THEN
        ALTER TABLE products ADD COLUMN cost_price DECIMAL(10, 2) DEFAULT 0.00;
        COMMENT ON COLUMN products.cost_price IS 'Preço de custo unitário (referência)';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'sale_price') THEN
        ALTER TABLE products ADD COLUMN sale_price DECIMAL(10, 2) DEFAULT 0.00;
        COMMENT ON COLUMN products.sale_price IS 'Preço de venda unitário (tabela/sugerido)';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'products' AND column_name = 'image_url') THEN
        ALTER TABLE products ADD COLUMN image_url TEXT;
        COMMENT ON COLUMN products.image_url IS 'URL da imagem do produto (opcional)';
    END IF;
END $$;

-- 3. Forçar atualização do cache da API
NOTIFY pgrst, 'reload schema';
