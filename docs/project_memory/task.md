# Task List

- [x] Implementar Split de Pagamentos (Backend & Frontend)
- [x] Debugging dos erros de caixa (Fixed via opening_employee_id)
- [x] Estratégia de usuários (Validated)
- [x] Verificar chamadas de `createSale` (Fixed in SalesPage.tsx)
- [x] Reforçar Segurança (RLS Database)
- [x] Ajustar Fechamento de Caixa com Split
- [x] Implementar "Limpeza de Sessões Presas" (Zombie Registers)
- [ ] Validar Fluxo de Permissões (PIN na navegação)

## Transformação SaaS (Produto Comercial) 🚀
### Fase 1: Fundação Multi-Tenant (Técnico)
- [x] Criar Documento de Arquitetura (ROADMAP_SAAS.md)
- [x] **Migração de Banco de Dados V1** (Estrutura e Colunas)
- [x] **Migração de Banco de Dados V2** (Políticas RLS e defaults)
- [ ] **Adaptação do Backend** (Validar e Testar integridade)
- [ ] **Página de Login SaaS** (Identificar tenant pelo usuário)

### Fase 2: Diferenciais de Produto (Funcional)
- [ ] **Emissão de NFC-e Real** (Integração com eNotas/FocusNFE) <!-- CRITICAL -->
- [ ] **Dashboards de Gestão** (Vendas por período, Curva ABC, Lucratividade)
- [ ] **Relatórios Fiscais** (Sintegra/SPED - Exportação básica)
- [ ] **Configuração da Loja** (Upload de Logo, Cor, Dados Tributários)

### Fase 3: Venda e Escala
- [ ] **Landing Page de Vendas**
- [ ] **Fluxo de Onboarding** (Wizard de configuração inicial)
- [ ] **Billing** ( Integração Stripe/Asaas para travar inadimplentes)
