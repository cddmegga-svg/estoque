# Task List

- [x] Implementar Split de Pagamentos (Backend & Frontend)
- [x] Debugging dos erros de caixa (Fixed via opening_employee_id)
- [x] Estratégia de usuários (Validated)
- [x] Verificar chamadas de `createSale` (Fixed in SalesPage.tsx)
- [x] Reforçar Segurança (RLS Database)
- [x] Ajustar Fechamento de Caixa com Split
- [x] Implementar "Limpeza de Sessões Presas" (Zombie Registers)
- [x] Migração SaaS DB Phase 1 & 2 (RLS & Tenancy)
- [x] Melhorias de UX (Persistência & Login Rigoroso)
- [x] **Migração de Permissões (Login -> Equipe)** (Moves permissions to Employees table)
- [x] **Sidebar Cirúrgica** (Hides items based on active employee)
- [x] **Modo Quiosque (Unlock)** (Session-based unlock via PIN)
- [x] **Configurar Admin/Dono (PIN 060813)**
- [x] **Validar Fluxo de Desbloqueio** (No-reload fix applied)
- [x] **Gestão de Equipe (Cargos)** (Adicionado Estoquista/Farmacêutico)
- [x] **Limpeza de Usuários (RPC e FKs Fix)** (Funcionalidade "Lixeira Segura")
- [x] **Dashboard Multi-Loja (Admin View)**

## Transformação SaaS (Produto Comercial) 🚀
### Fase 1: Fundação Multi-Tenant (Técnico)
- [x] Criar Documento de Arquitetura (ROADMAP_SAAS.md)
- [x] **Migração de Banco de Dados** (RLS + TenantID)
- [x] **Backend: RPC de Registro** (register_new_tenant)
- [/] **Frontend: Tela de Cadastro de Farmácia** (Em progresso)
- [ ] **Adaptação do Login** (Redirecionar para Dashboard correto)

### Fase 2: Gestão do Dono do Software (Nós) 👑
- [ ] **Super Admin Dashboard** (Ver todas as farmácias cadastradas)
- [ ] **Gestão de Assinaturas** (Bloquear inadimplentes)

### Fase 3: Venda e Escala
- [ ] **Landing Page & Billing**
