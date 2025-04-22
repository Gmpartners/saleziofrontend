# WhatsApp Multi-atendimento

Sistema de multiatendimento via WhatsApp com triagem automatizada por IA.

## Funcionalidades

- Triagem automática de mensagens usando IA (OpenRouter)
- Gerenciamento de setores de atendimento
- Interface CLI para atendentes
- Comunicação em tempo real via WebSockets
- Templates de mensagens por setor
- Métricas de atendimento

## Requisitos

- Node.js 16+
- MongoDB
- Redis (opcional, para escala)

## Instalação

1. Clone o repositório:
```bash
git clone https://github.com/gmpartners/wpp-multiatendimento.git
cd wpp-multiatendimento
```

2. Instale as dependências:
```bash
npm install
```

3. Crie o arquivo `.env` com as configurações:
```bash
PORT=3000
BRANCH=dev
MONGODB_URI=mongodb://localhost:27017/wpp-multiatendimento
OPENROUTER_API_KEY=sua-chave-api
OPENROUTER_MODEL=deepseek/deepseek-chat
API_TOKEN=seu-token-de-acesso
NODE_ENV=development
SOCKET_PORT=3001
```

4. Inicie o servidor:
```bash
npm start
```

## CLI para Atendentes

O sistema inclui uma interface de linha de comando para atendentes:

```bash
npm run cli
```

### Comandos na CLI:

- No menu principal:
  - `1` - Listar conversas
  - `2` - Ver conversa específica
  - `3` - Ativar/desativar atualização automática
  - `4` - Sair

- Na visualização de conversa:
  - `/menu` - Voltar ao menu principal
  - `/finalizar` - Finalizar a conversa atual
  - `/transferir` - Transferir para outro setor

## API REST

### Autenticação

Todas as requisições devem incluir o header `x-api-token` com o token definido no arquivo `.env`.

### Endpoints

#### Setores

- `GET /api/setores` - Listar todos os setores
- `POST /api/setores` - Criar novo setor
- `GET /api/setores/:id` - Obter setor por ID
- `PUT /api/setores/:id` - Atualizar setor
- `DELETE /api/setores/:id` - Excluir setor (desativação lógica)

#### Conversas

- `GET /api/conversas` - Listar conversas (filtros: setor, status, telefone)
- `POST /api/conversas` - Iniciar nova conversa ou adicionar mensagem
- `GET /api/conversas/:id` - Obter conversa por ID
- `PUT /api/conversas/:id` - Atualizar status ou setor da conversa
- `POST /api/conversas/:id/mensagens` - Adicionar mensagem de atendente
- `GET /api/estatisticas` - Obter estatísticas de atendimento

#### Templates

- `GET /api/templates` - Listar templates (filtros: setor, ativo)
- `POST /api/templates` - Criar novo template
- `GET /api/templates/:id` - Obter template por ID
- `PUT /api/templates/:id` - Atualizar template
- `DELETE /api/templates/:id` - Excluir template (desativação lógica)

## WebSockets

O sistema utiliza Socket.IO para comunicação em tempo real. Eventos disponíveis:

- `atendente:login` - Registrar atendente
- `conversa:selecionar` - Selecionar conversa para atendimento
- `mensagem:enviar` - Enviar mensagem para o cliente
- `conversa:finalizar` - Finalizar conversa
- `conversa:transferir` - Transferir conversa para outro setor

## Integração com WhatsApp

Para integrar com uma API de WhatsApp, configure o webhook para enviar mensagens para o endpoint `/api/conversas` com os dados da mensagem.

## Licença

Este projeto é propriedade da GM Partners.
# Teste workflow env preservation
# Teste final de preservação de arquivos .env*
