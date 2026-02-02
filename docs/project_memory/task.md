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

## Melhorias de Gestão (Atual)
- [/] **Gestão de Usuários e Equipe**
    - [ ] Adicionar Roles: Estoquista, Farmacêutico.
    - [ ] Implementar deleção de Usuários de Login (antigos).
    - [ ] Validar visão Multi-Filial para Admin.

## Transformação SaaS (Produto Comercial) 🚀
### Fase 1: Fundação Multi-Tenant (Técnico)
- [x] Criar Documento de Arquitetura (ROADMAP_SAAS.md)
- [x] **Migração de Banco de Dados**
- [ ] **Adaptação do Backend** (Validar e Testar integridade)
- [ ] **Página de Login SaaS** (Identificar tenant pelo usuário)

### Fase 2: Diferenciais de Produto (Funcional)
- [ ] **Emissão de NFC-e Real** (Integração com eNotas/FocusNFE)
- [ ] **Dashboards de Gestão**
- [ ] **Configuração da Loja**

### Fase 3: Venda e Escala
- [ ] **Landing Page & Billing**
