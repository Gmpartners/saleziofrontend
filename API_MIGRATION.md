# Migração para API MultiFlow

## Visão Geral

Este documento descreve as alterações realizadas para migrar o frontend para a nova API MultiFlow, com remoção temporária do dashboard.

## Alterações Realizadas

### 1. Configuração e Ambiente

- Atualizado arquivo `.env` com novos endpoints e token de API
- Criado arquivo de constantes `src/config/constants.js` para centralizar valores

### 2. Modelos de Dados

- Criado arquivo `src/models/multiflow.js` com definições de estruturas de dados
- Implementados mapeamentos para status, tipos de mensagens e eventos

### 3. Serviços

#### 3.1. Serviço de API

- Refatorado `src/services/api.js` para usar a nova estrutura de endpoints
- Implementados métodos para:
  - Gestão de setores
  - Gestão de conversas
  - Envio de mensagens
  - Operações específicas (transferir, finalizar, arquivar)
- Mantidos métodos de compatibilidade para retrocompatibilidade

#### 3.2. Serviço de WebSocket

- Atualizado `src/services/socket.js` para a nova autenticação WebSocket
- Implementado sistema de salas conforme a API MultiFlow
- Mantidos métodos de compatibilidade para retrocompatibilidade

### 4. Contextos

- Atualizado `src/contexts/SocketContext.jsx` para trabalhar com os novos eventos
- Adaptado para usar os novos métodos da API e WebSocket

### 5. Interface

- Removido temporariamente o dashboard do `App.jsx`
- Redirecionada a rota padrão para a página de conversas

## Estrutura de Dados MultiFlow

### Setores

```javascript
{
  "_id": "680c49eadec50dbc4e59fea1",
  "userId": "test-user",
  "nome": "Financeiro",
  "descricao": "Setor responsável por pagamentos, boletos e questões financeiras",
  "responsavel": "Miguel",
  "ativo": true,
  "created": "2025-04-26T02:50:18.944Z",
  "updated": "2025-04-26T02:50:18.944Z"
}
```

### Conversas

```javascript
{
  "_id": "680c58abf5009cd37fdc121a",
  "userId": "test-user",
  "telefoneCliente": "5521999887766",
  "nomeCliente": "Cliente Teste",
  "setorId": {
    "_id": "680c49f0dec50dbc4e59fea3",
    "nome": "Comercial"
  },
  "status": "aguardando",  // valores possíveis: "aguardando", "em_andamento", "finalizada"
  "atendenteId": null,
  "mensagens": [
    {
      "remetente": "cliente", // valores possíveis: "cliente", "atendente", "bot"
      "conteudo": "Olá, preciso de ajuda",
      "timestamp": "2025-04-26T03:53:15.919Z",
      "lida": false,
      "midia": false,
      "tipo": "texto",
      "_id": "680c58abf5009cd37fdc121b"
    }
  ],
  "arquivada": false,
  "metadados": {
    "aguardandoEscolhaSetor": true
  },
  "ultimaAtividade": "2025-04-26T03:53:15.922Z",
  "created": "2025-04-26T03:53:15.922Z"
}
```

## Eventos WebSocket

| Evento | Descrição | Dados |
|--------|-----------|-------|
| `nova_mensagem` | Nova mensagem recebida | `{ conversaId, mensagem, conversa }` |
| `nova_conversa` | Nova conversa iniciada | `{ conversa }` |
| `conversa_atualizada` | Conversa foi atualizada | `{ conversa, nova }` |

## Salas WebSocket

Para receber eventos específicos, entrar nas seguintes salas:

| Sala | Descrição |
|------|-----------|
| `user_{userId}` | Eventos globais do usuário |
| `user_{userId}_setor_{setorId}` | Eventos específicos de um setor |
| `user_{userId}_conversa_{conversaId}` | Eventos específicos de uma conversa |

## Próximos Passos

- Implementar o novo dashboard utilizando a API MultiFlow
- Atualizar os componentes restantes para usar a nova estrutura de dados
- Adicionar novos recursos disponíveis na API