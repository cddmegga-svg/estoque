# Project Analysis & Supabase Integration

- [x] Analyze current project structure and code quality (The "X-Ray") <!-- id: 0 -->
- [x] Analyze database schema `database/schema.sql` <!-- id: 1 -->
- [x] Create Implementation Plan for Supabase Backend <!-- id: 2 -->
- [x] Configure Supabase Client <!-- id: 3 -->
- [x] Implement Authentication (if required by schema) <!-- id: 4 -->
- [x] Integrate Database Interactions <!-- id: 5 -->
  - [x] Adicionar botão de Remover Produto
- [x] Melhorias de Cadastro e Importação (Fase 14)
  - [x] Banco de Dados: Adicionar colunas `category` e `distributor` em Produtos (SQL Criado)
  - [x] Tipagem e API: Atualizar interfaces e funções CRUD
  - [x] Tela de Produtos: Adicionar campos no formulário e filtro por Categoria
  - [x] Importação XML: Tornar campos editáveis (Nome, Fab, Dist, Categoria) na conferência
- [x] Controle de Estoque Mínimo (Fase 15)
  - [x] Banco de Dados: Adicionar coluna `min_stock` em Produtos
  - [x] Tipagem e API: Atualizar interfaces e funções CRUD
  - [x] Tela de Produtos: Adicionar campo "Estoque Mínimo" no formulário
  - [x] Visualização: Destacar produtos com baixo estoque (Alerta Visual)
  - [x] Relatório: Filtro "Abaixo do Mínimo" para compra
- [x] Refactor and Improve Codebase based on Analysis <!-- id: 6 -->

# Phase 2: Admin & Scale
- [x] Debug and Fix Stock Page Whitescreen <!-- id: 7 -->
- [x] Database: Add `type` to Filiais and `register_sale` RPC <!-- id: 8 -->
- [x] API: Update types and services for Filiais <!-- id: 9 -->
- [x] UI: Implement Admin Filial Management <!-- id: 10 -->
- [x] UI: Ensure Admin Navigation visibility <!-- id: 11 -->
- [x] Docs: Create PDV Integration Guide <!-- id: 12 -->

# Phase 3: Bugfixes & Polish
- [x] UI: Add Logout Button <!-- id: 13 -->
- [x] UI: Implement Create Transfer Action <!-- id: 16 -->
- [x] Fix: Ensure Admin User exists <!-- id: 14 -->
- [x] Debug: Harden StockPage against crashes <!-- id: 15 -->

# Phase 4: Visual Overhaul & Features
- [x] UI: Update Theme to Emerald Green <!-- id: 17 -->
- [x] UI: Implement Sidebar Layout <!-- id: 18 -->
- [x] Feature: Create Manual Movement Page <!-- id: 19 -->
- [x] Feature: Manual Movement History & Logic <!-- id: 37 -->

# Phase 5: Smart Features & Polish
- [x] UI: Smart Movement Form (Auto-Lote, Barcode Search) <!-- id: 20 -->
- [x] UI: Display Product Details (NCM, Manufacturer) <!-- id: 21 -->
- [x] Feature: Product Search by Name/EAN (Combobox) <!-- id: 22 -->

# Phase 6: Product Management
- [x] API: Update addProduct for auto-ID & Fields <!-- id: 23 -->
- [x] UI: Products List Page <!-- id: 24 -->
- [x] UI: Product Registration Dialog <!-- id: 25 -->
- [x] Nav: Add Products to Sidebar & Routing <!-- id: 26 -->

# Phase 7: Pricing & Integration
- [x] DB: Add cost_price & sale_price to Products <!-- id: 27 -->
- [x] UI: Update Product Form with Pricing <!-- id: 28 -->
- [x] Doc: Create "Manual de Integração para Desenvolvedores" <!-- id: 29 -->

# Phase 8: Rebranding & Polish
- [x] Assets: Generate clean "Grupo Mega Farma" Logo <!-- id: 30 -->
- [x] UI: Update App Name & Logo in Sidebar/Login <!-- id: 31 -->
- [x] Meta: Update index.html Title <!-- id: 32 -->

# Phase 9: UI/UX & Polish
- [x] UI: Create "ATM-style" MoneyInput <!-- id: 33 -->
- [x] UI: Update Product Form with MoneyInput <!-- id: 34 -->
- [x] UI: Redesign Transfers Page (Multi-item + List) <!-- id: 35 -->
- [x] Feat: Add Print Transfer Receipt <!-- id: 36 -->
# Phase 10: Mobile Experience & Scanning
- [x] UI: Responsive Sidebar & Layout (Mobile) <!-- id: 38 -->
- [x] UI: Mobile-friendly Tables (Cards/Scroll) <!-- id: 39 -->
- [x] Feature: Barcode Scanner Component (Camera) - **REMOVIDO** (Complexidade/Insegurança) <!-- id: 40 -->
- [x] Feature: Integrate Scanner into Transfer/Movement - **REMOVIDO** <!-- id: 41 -->
