# Manual de Integração Técnica - FarmaFlow Cloud

**Versão:** 1.0  
**Destinatário:** Equipe de Desenvolvimento do PDV

Este documento descreve os padrões técnicos para integrar a solução de PDV local com o ecossistema FarmaFlow Cloud (Supabase).

---

## 1. Visão Geral da Arquitetura

O **FarmaFlow Cloud** atua como o sistema central (ERP/Retaguarda), detendo a "Mestre" dos dados de Produtos, Preços e Estoque. O **PDV** deve operar de forma híbrida:
1.  **Sincronização (Downstream)**: Baixa periodicamente o catálogo de produtos e tabelas de preços da nuvem.
2.  **Operação (Local)**: Realiza vendas localmente (mesmo offline).
3.  **Transmissão (Upstream)**: Envia as vendas para a nuvem para baixa de estoque e auditoria.

---

## 2. Autenticação e Conexão

A comunicação é feita via API REST (Supabase/PostgREST).

*   **Base URL**: `https://[SEU-PROJETO].supabase.co`
*   **Headers Obrigatórios**:
    ```http
    apikey: [SUA_CHAVE_ANON_OU_SERVICE]
    Authorization: Bearer [SUA_CHAVE_ANON_OU_SERVICE]
    Content-Type: application/json
    ```

> **Nota**: Para o PDV, recomendamos criar um usuário de sistema (ex: `pdv@loja01.com`) e autenticar via `/auth/v1/token` para obter um JWT seguro, ou utilizar uma Service Key restrita se a arquitetura permitir.

---

## 3. Sincronização de Produtos e Preços (Cloud -> PDV)

O PDV deve consultar a tabela `products` para obter cadastros e preços atualizados.

**Endpoint**: `GET /rest/v1/products?select=*`

**Exemplo de Resposta (JSON):**
```json
[
  {
    "id": "c0eebc99-...",
    "name": "Paracetamol 500mg",
    "ean": "7891234567890",
    "ncm": "30049099",
    "manufacturer": "EMS",
    "active_ingredient": "Paracetamol",
    "sale_price": 10.50,  // Preço Sugerido de Venda
    "cost_price": 5.40,   // Preço de Custo (Referência)
    "updated_at": "2024-01-01T10:00:00Z"
  }
]
```

**Recomendação de Implementação:**
*   Realizar um FULL SYNC na abertura do caixa.
*   Realizar INCREMENTAL SYNC a cada 30 min (filtrando por `updated_at > [ultima_sincronizacao]`).

---

## 4. Registro de Vendas e Baixa de Estoque (PDV -> Cloud)

Para garantir a integridade do estoque (controle de lotes e validade FIFO), o PDV **NÃO** deve manipular a tabela de estoque diretamente. Utilize a RPC (Remote Procedure Call) dedicada.

**Endpoint**: `POST /rest/v1/rpc/register_sale`

**Payload (Body):**
```json
{
  "p_filial_id": "UUID_DA_LOJA_ATUAL",
  "p_user_id": "UUID_DO_VENDEDOR_OU_PDV",
  "p_user_name": "Nome do Vendedor",
  "p_items": [
    {
      "ean": "7891234567890",
      "quantity": 2
    },
    {
      "ean": "7899876543210",
      "quantity": 1
    }
  ]
}
```

**Comportamento da API:**
1.  Busca o produto pelo `ean`.
2.  Localiza os lotes com vencimento mais próximo (FIFO).
3.  Deduz a quantidade automaticamente.
4.  Registra a movimentação de saída.
5.  Retorna `200 OK` em caso de sucesso ou `400/500` com mensagem de erro (ex: "Estoque insuficiente").

---

## 5. Contingência e Offline

Como o PDV é crítico, ele deve ser "Offline First":

1.  **Venda Offline**: O PDV registra a venda em seu banco local (SQLite/etc).
2.  **Fila de Sincronização**: Adiciona a venda pendente em uma fila.
3.  **Background Job**: Um serviço tenta enviar as vendas da fila para a API `register_sale`.
    *   **Sucesso**: Marca como sincronizado.
    *   **Erro (4xx)**: Loga erro crítico (ex: produto não cadastrado na nuvem) para gerente ver.
    *   **Erro (5xx/Timeout)**: Mantém na fila para tentar novamente.

---

## 6. Suporte

Para dúvidas técnicas ou solicitação de chaves de API de homologação, contate a equipe de TI interna.
