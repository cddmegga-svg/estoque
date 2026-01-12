# Guia de Integração PDV (Sistema Híbrido)

Este guia descreve como integrar o sistema de Ponto de Venda (PDV) local (Desktop/Windows ou outro) com o sistema de estoque na nuvem (FarmaControl/Supabase).

## Visão Geral

O PDV deve comunicar as vendas para a nuvem para que o estoque seja baixado automaticamente. Isso é feito através de uma chamada segura à API do Supabase.

## Detalhes da API

**Endpoint**: Função RPC `register_sale`
**Método**: POST (via Supabase SDK ou HTTP REST)

### Parâmetros

A função aceita os seguintes parâmetros:

| Parâmetro      | Tipo   | Descrição                                         |
| :------------- | :----- | :------------------------------------------------ |
| `p_filial_id`  | UUID   | ID da filial que está realizando a venda.         |
| `p_user_id`    | UUID   | ID do usuário (vendedor) no sistema nuvem.        |
| `p_user_name`  | String | Nome do vendedor (para registro no histórico).    |
| `p_items`      | JSON   | Lista de itens vendidos (EAN e Quantidade).       |

### Estrutura do JSON `p_items`

```json
[
  {
    "ean": "7891234567890",
    "quantity": 1
  },
  {
    "ean": "7891234567891",
    "quantity": 2
  }
]
```

## Exemplo de Implementação (JavaScript/Node.js)

Se o seu PDV usa JavaScript, você pode usar a biblioteca `@supabase/supabase-js`:

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient('SUA_URL_SUPABASE', 'SUA_CHAVE_PUBLICA')

async function registrarVendaNoEstoque(vendaLocal) {
  
  const payload = {
    p_filial_id: 'ID_DA_LOJA_LOCAL',
    p_user_id: 'ID_DO_USUARIO_LOCAL',
    p_user_name: 'Nome do Vendedor',
    p_items: vendaLocal.itens.map(item => ({
      ean: item.codigo_barras,
      quantity: item.qtd
    }))
  }

  const { data, error } = await supabase.rpc('register_sale', payload)

  if (error) {
    console.error('Erro ao baixar estoque:', error)
    // Implementar lógica de "fila" para tentar novamente se estiver offline
  } else {
    console.log('Estoque baixado com sucesso:', data.message)
  }
}
```

## Exemplo de Chamada HTTP (cURL)

Para sistemas legados (Delphi, C#, VB6), você pode fazer uma requisição HTTP POST simples:

```bash
curl -X POST 'https://SEU_PROJETO.supabase.co/rest/v1/rpc/register_sale' \
  -H "apikey: SUA_CHAVE_PUBLICA" \
  -H "Authorization: Bearer SUA_CHAVE_PUBLICA" \
  -H "Content-Type: application/json" \
  -d '{
    "p_filial_id": "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
    "p_user_id": "b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b01",
    "p_user_name": "Sistema PDV",
    "p_items": [
      {"ean": "7891234567890", "quantity": 1}
    ]
  }'
```

## Tratamento de Erros e Offline

Como se trata de um sistema híbrido, a conexão com a internet pode falhar.
1.  **Offline First**: O PDV deve registrar a venda localmente primeiro.
2.  **Sincronização**: Tente enviar para o Supabase. Se falhar (timeout/sem internet), salve essa requisição em uma fila local.
3.  **Retentativa**: Um serviço em segundo plano deve processar essa fila assim que a internet voltar.

## Lógica de Baixa (FIFO)

O sistema nuvem usa lógica FIFO (First-In, First-Out) baseada na validade. Ele deduzirá automaticamente as quantidades dos lotes com vencimento mais próximo.
