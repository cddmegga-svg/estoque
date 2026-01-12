-- ============================================================================
-- SCRIPT DE CORREÇÃO DE PERMISSÕES
-- ============================================================================

-- IMPORTANTE: Substitua o ID abaixo caso 'robson.rodri@gmail.com' não seja o email correto 
-- ou se o usuário foi criado com outro método de autenticação.

DO $$
DECLARE
  v_user_email VARCHAR := 'robson.rodri@gmail.com';
  v_user_id UUID;
  v_filial_id UUID;
BEGIN
  -- 1. Buscar o ID do usuário pelo email na tabela auth.users (Tabela interna do Supabase/GoTrue)
  SELECT id INTO v_user_id FROM auth.users WHERE email = v_user_email;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Usuário % não encontrado na tabela de autenticação (auth.users). Verifique se o cadastro foi feito.', v_user_email;
  ELSE
    RAISE NOTICE 'Usuário encontrado: % (ID: %)', v_user_email, v_user_id;

    -- 2. Garantir que uma filial existe (pegar a primeira)
    SELECT id INTO v_filial_id FROM filiais LIMIT 1;

    -- 3. Inserir ou Atualizar na tabela pública 'users'
    INSERT INTO public.users (id, email, name, role, filial_id)
    VALUES (v_user_id, v_user_email, 'Robson Rodrigues', 'admin', v_filial_id)
    ON CONFLICT (email) DO UPDATE 
    SET role = 'admin', filial_id = COALESCE(users.filial_id, v_filial_id);
    
    RAISE NOTICE 'Permissões de ADMIN concedidas com sucesso para %', v_user_email;
  END IF;
END $$;
