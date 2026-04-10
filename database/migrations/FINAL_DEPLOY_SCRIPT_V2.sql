-- ==========================================
-- FINAL DEPLOY SCRIPT (CORRECÃO DE ERROS)
-- ==========================================
-- Este script corrige o erro da coluna "tenant_id" faltando e aplica todas as mudanças.

-- [PARTE 1] ADICIONAR PIN A USUÁRIOS
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'pin') THEN
        ALTER TABLE public.users ADD COLUMN pin TEXT;
    END IF;
END $$;

-- [PARTE 2] ATUALIZAR FUNÇÃO DE CADASTRO (COM PIN)
CREATE OR REPLACE FUNCTION register_new_tenant(
    p_company_name TEXT, p_document TEXT, p_user_email TEXT, p_user_name TEXT, p_user_id UUID, p_user_pin TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    v_tenant_id UUID; v_filial_id UUID;
BEGIN
    INSERT INTO tenants (name, document, plan_status, settings) VALUES (p_company_name, p_document, 'active', '{"primary_color": "#10b981"}'::jsonb) RETURNING id INTO v_tenant_id;
    INSERT INTO filiais (name, cnpj, address, type, tenant_id) VALUES ('Matriz - ' || p_company_name, p_document, 'Endereço Principal', 'store', v_tenant_id) RETURNING id INTO v_filial_id;
    INSERT INTO users (id, name, email, role, filial_id, tenant_id, permissions, pin)
    VALUES (p_user_id, p_user_name, p_user_email, 'admin', v_filial_id, v_tenant_id, ARRAY['admin_access', 'manage_users', 'manage_stock', 'view_financial', 'view_reports', 'access_pos'], p_user_pin)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, role = EXCLUDED.role, filial_id = EXCLUDED.filial_id, tenant_id = EXCLUDED.tenant_id, permissions = EXCLUDED.permissions, pin = EXCLUDED.pin;
    UPDATE auth.users SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('tenant_id', v_tenant_id) WHERE id = p_user_id;
    RETURN jsonb_build_object('tenant_id', v_tenant_id, 'message', 'Success');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- [PARTE 3] SECURITY HARDENING & FIX DE COLUNAS

-- A. Definir Função Segura PRIMEIRO
CREATE OR REPLACE FUNCTION get_current_tenant_id() RETURNS UUID AS $$ 
BEGIN 
    RETURN (auth.jwt() -> 'app_metadata' ->> 'tenant_id')::UUID; 
END; 
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- B. CORREÇÃO: Adicionar tenant_id em tabelas esquecidas
DO $$
DECLARE
    t text;
    -- Lista de tabelas que podem estar sem a coluna (incluindo as que deram erro)
    tables text[] := ARRAY['transfers', 'conference_sessions', 'conference_items', 'nfe_imports', 'users'];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        -- Verifica se a tabela existe
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
            -- Verifica se a coluna tenant_id existe
            IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = t AND column_name = 'tenant_id') THEN
                -- Adiciona coluna com Default seguro (tabela Matrix/Legacy) para dados existentes
                EXECUTE format('ALTER TABLE %I ADD COLUMN tenant_id UUID DEFAULT ''00000000-0000-0000-0000-000000000000''', t);
                
                -- Tenta adicionar FK se a tabela tenants existir
                BEGIN
                    EXECUTE format('ALTER TABLE %I ADD CONSTRAINT fk_%I_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id)', t, t);
                EXCEPTION WHEN OTHERS THEN
                    NULL; -- Ignora erro se FK ja existir ou der conflito
                END;
                
                -- Atualiza o Default para a função dinâmica (para novos inserts)
                EXECUTE format('ALTER TABLE %I ALTER COLUMN tenant_id SET DEFAULT get_current_tenant_id()', t);
                
                RAISE NOTICE 'Corrigida tabela %: adicionado tenant_id', t;
            END IF;
        END IF;
    END LOOP;
END $$;

-- C. Habilitar RLS
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conference_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.nfe_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.conference_items ENABLE ROW LEVEL SECURITY;

-- D. Aplicar Políticas (Recriando para garantir)
DO $$ 
DECLARE 
    t text; 
    tables text[] := ARRAY['users', 'transfers', 'conference_sessions', 'conference_items', 'nfe_imports']; 
BEGIN
    FOREACH t IN ARRAY tables LOOP
        IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = t) THEN
            EXECUTE format('DROP POLICY IF EXISTS "Public Access" ON %I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated users full access" ON %I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Tenant Isolation" ON %I', t);
            EXECUTE format('DROP POLICY IF EXISTS "Enable read access for all users" ON %I', t);
            
            -- Cria política de isolamento
            EXECUTE format('
                CREATE POLICY "Tenant Isolation" ON %I
                AS PERMISSIVE
                FOR ALL
                TO authenticated
                USING (tenant_id = get_current_tenant_id())
                WITH CHECK (tenant_id = get_current_tenant_id())
            ', t);
        END IF;
    END LOOP;
END $$;

-- E. Corrigir Views (Security Invoker)
DO $$ 
DECLARE 
    v text; 
    views text[] := ARRAY['stock_consolidated', 'v_filial_stock_status', 'expiration_dashboard', 'transfers_history', 'v_product_performance', 'stock_value_by_filial', 'v_daily_sales']; 
BEGIN
    FOREACH v IN ARRAY views LOOP 
        IF EXISTS (SELECT FROM pg_views WHERE schemaname = 'public' AND viewname = v) THEN
            EXECUTE format('ALTER VIEW %I SET (security_invoker = true)', v); 
        END IF;
    END LOOP;
END $$;

-- F. Política Backup para Users (Self Access)
DROP POLICY IF EXISTS "Users Self Access" ON public.users;
CREATE POLICY "Users Self Access" ON public.users FOR SELECT TO authenticated USING (auth.uid() = id);
