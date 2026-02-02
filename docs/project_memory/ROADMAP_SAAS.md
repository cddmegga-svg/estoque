# Roadmap de Transformação SaaS: PharmaFlow Product 🚀

Este documento define a estratégia técnica e de produto para transformar o sistema interno "Estoque" no produto comercial **PharmaFlow**.

## 1. Arquitetura Multi-Tenant (O Coração do SaaS)

Para vender para várias farmácias usando o mesmo sistema, precisamos isolar os dados de cada cliente.

### Estratégia: Row Level Security (RLS) com `tenant_id`
Em vez de criar um banco de dados por cliente (caro e difícil de manter), usaremos uma coluna `tenant_id` em **todas** as tabelas.

- **Tabela `tenants` (Clientes/Farmácias):**
  - `id` (UUID)
  - `name` (Nome da Farmácia)
  - `cnpj`
  - `plan_status` (active, trial, suspended)
  - `custom_logo_url` (Personalização)
  - `primary_color` (Personalização do Tema)

- **Alteração nas Tabelas Existentes:**
  - Adicionar coluna `tenant_id` (FK -> tenants.id).
  - Atualizar Políticas RLS: `WHERE tenant_id = auth.user_metadata->'tenant_id'`.

### Fluxo de Login SaaS
1. Usuário loga com email/senha.
2. Supabase Auth retorna o Token JWT contendo o `tenant_id` desse usuário.
3. O Banco de Dados bloqueia automaticamente qualquer acesso a dados de outros `tenant_id`.

## 2. Onboarding & Venda (Self-Service)

O sistema precisa se vender sozinho.

- **Landing Page Comercial:** "Automatize sua Farmácia em 5 minutos".
- **Fluxo de Signup:**
  1. Cadastro do Dono (Admin).
  2. Criação da "Organização" (Tenant).
  3. Setup Inicial (Assistente para importar produtos ou usar base padrão).
- **Base de Dados Global de Produtos:**
  - Manteremos uma tabela "Catálogo Global" (Master) com 20.000+ medicamentos pré-cadastrados.
  - Quando a farmácia nova entra, ela já vê os produtos, só precisa ajustar estoque/preço. Isso é um **grande diferencial**.

## 3. Gestão de Assinaturas (Billing)

Integração com Gateway de Pagamento (Sugestão: Asaas ou Stripe).

- **Planos:**
  - **Básico:** 1 Filial, 2 Usuários.
  - **Pro:** Multi-filiais, NFE ilimitada.
  - **Enterprise:** Personalizado.
- **Bloqueio Automático:** Se o pagamento falhar, o status do tenant vira `suspended` e o acesso é bloqueado via Middleware.

## 4. Personalização (White-Label Light)

Para a farmácia sentir que o sistema é "dela":
- Upload de Logo na Configuração.
- Escolha de Cor Primária (Afeta botões e barras laterais).
- Cabeçalho dos Cupões/Relatórios personalizado.

## Próximos Passos Técnicos

1. **Migração Database:** Criar tabela `tenants` e adicionar `tenant_id` em tudo.
2. **Atualização do Frontend:** Garantir que `createSale` e outras funções enviem o `tenant_id` (ou deixar o backend pegar do user context).
3. **Página de Configuração da Loja:** Onde o dono sobe a logo.

---
*Gerado por Antigravity Agent - 2026*
