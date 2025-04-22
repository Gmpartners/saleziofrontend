# WhatsApp Multi-atendimento

Sistema de multiatendimento via WhatsApp com triagem automatizada por IA, autenticação via tokens JWT e comunicação em tempo real.

## Funcionalidades

- **Triagem Inteligente**: Identificação automática do setor mais adequado para cada conversa
- **Autenticação por Tokens**: Sistema de autenticação baseado em JWT com suporte para Firebase Auth
- **Níveis de Acesso**: Administradores e representantes de setor com diferentes permissões
- **Transferência Entre Setores**: Comandos rápidos e transferência facilitada entre departamentos
- **Atendimento em Tempo Real**: Notificações instantâneas e indicadores de "digitando"
- **Templates Personalizados**: Templates por setor e pessoais para cada representante
- **Dashboard Avançado**: Métricas detalhadas específicas para cada nível de usuário
- **Comandos Rápidos**: Sistema de atalhos com "/" para ações comuns (transferir, finalizar)
- **Métricas Avançadas**: Taxa de engajamento, tempo médio de resolução, volume por período
- **Integração com WhatsApp**: Suporte à API WhatsApp para envio e recebimento de mensagens

## Fluxo de Atendimento

1. **Recepção**: Cliente envia mensagem e é recebido com uma saudação automática
2. **Triagem**: O sistema analisa a mensagem e identifica o setor mais adequado
3. **Atendimento**: Representantes do setor recebem notificações em tempo real
4. **Interação**: Uso de templates e comandos rápidos para agilizar o atendimento
5. **Transferência**: Se necessário, transferência facilitada entre setores com comando `/transferir`
6. **Finalização**: O representante finaliza o atendimento com comando `/finalizar`

## Requisitos

- Node.js 16+
- MongoDB
- Frontend com Firebase Auth (opcional para autenticação avançada)

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
PORT=3100                                      # Porta para ambiente dev (3001 para produção)
BRANCH=dev                                     # Branch atual (dev ou main)
MONGODB_URI=mongodb://localhost:27017/wpp-multiatendimento-dev  # URI do MongoDB
OPENROUTER_API_KEY=sua-chave-api               # Chave da API OpenRouter para IA
OPENROUTER_MODEL=deepseek/deepseek-chat        # Modelo de IA a ser utilizado
API_TOKEN=seu-token-de-acesso                  # Token para autenticação legacy
JWT_SECRET=seu-segredo-jwt                     # Chave secreta para tokens JWT
NODE_ENV=development                           # Ambiente (development ou production)
SOCKET_PORT=3101                               # Porta para WebSockets (3102 para produção)
API_URL=http://api.dominio.com:8080/api        # URL base da API (sem porta para produção)
SOCKET_URL=http://api.dominio.com:8080         # URL base de WebSockets (sem porta para produção)
WHATSAPP_API_KEY=sua-chave-api-whatsapp        # Chave da API do WhatsApp
```

4. Inicie o servidor:
```bash
npm start
```

## Sistema de Autenticação

O sistema suporta dois métodos de autenticação:

### 1. Autenticação Legacy (para compatibilidade)
- Usa a variável `API_TOKEN` no header `x-api-token`
- Mais simples, sem suporte a níveis de acesso

### 2. Autenticação JWT (recomendada)
- Usa tokens JWT no header `Authorization: Bearer <token>`
- Suporta níveis de acesso (admin/representante)
- Integração com Firebase Auth no frontend
- Sincronização de usuários com o banco de dados

## Níveis de Acesso

### Administrador
- Acesso a todas as conversas em todos os setores
- Gestão de usuários e setores
- Visualização de métricas globais
- Capacidade de definir templates globais

### Representante de Setor
- Acesso apenas às conversas do seu setor
- Templates personalizados
- Dashboard simplificado do seu setor
- Nome de exibição personalizado

## Comandos Rápidos

O sistema suporta comandos rápidos durante o atendimento usando o prefixo `/`:

- `/transferir [setor]` - Transfere a conversa para outro setor
- `/finalizar` - Finaliza o atendimento
- `/template` ou `/t [nome]` - Usa um template cadastrado
- `/help` ou `/ajuda` - Mostra lista de comandos disponíveis

Além disso, é possível criar atalhos para templates digitando `/nome-do-template`.

## API REST

### Autenticação

Para todas as requisições, use um dos métodos de autenticação:
- Token legacy: Header `x-api-token` com o token do arquivo `.env`
- JWT: Header `Authorization: Bearer <token>` com o token JWT

### Endpoints Principais

#### Autenticação e Usuários
- `POST /api/sync-user` - Sincroniza usuário do Firebase
- `GET /api/meu-perfil` - Obter perfil do usuário autenticado
- `PUT /api/meu-perfil` - Atualizar perfil do usuário autenticado

#### Dashboard
- `GET /api/dashboard` - Obter estatísticas para dashboard (adaptadas ao nível de acesso)

#### Setores
- `GET /api/setores` - Listar todos os setores
- `POST /api/setores` - Criar novo setor (admin)
- `GET /api/setores/:id` - Obter setor por ID
- `PUT /api/setores/:id` - Atualizar setor (admin)
- `DELETE /api/setores/:id` - Desativar setor (admin)

#### Conversas
- `GET /api/conversas` - Listar conversas (filtradas por setor para representantes)
- `GET /api/conversas/:id` - Obter conversa por ID
- `POST /api/conversas` - Iniciar nova conversa ou adicionar mensagem
- `PUT /api/conversas/:id` - Atualizar status ou setor da conversa
- `POST /api/conversas/:id/mensagens` - Adicionar mensagem de atendente

#### Templates
- `GET /api/templates` - Listar templates (do setor ou globais)
- `GET /api/templates/meus` - Listar templates pessoais
- `POST /api/templates` - Criar novo template (setor ou pessoal)
- `GET /api/templates/:id` - Obter template por ID
- `PUT /api/templates/:id` - Atualizar template
- `DELETE /api/templates/:id` - Desativar template

#### Gerenciamento de Usuários (admin)
- `GET /api/usuarios` - Listar todos os usuários
- `GET /api/usuarios/:id` - Obter usuário por ID
- `PUT /api/usuarios/:id` - Atualizar usuário

### WebSockets

O sistema utiliza Socket.IO para comunicação em tempo real. A autenticação é feita via token JWT.

#### Autenticação no Socket
```javascript
const socket = io(SOCKET_URL, {
  auth: {
    token: "seu-token-jwt"
  }
});
```

#### Eventos Principais
- `conversas:listar` - Listar conversas do setor
- `conversa:selecionar` - Selecionar conversa para atendimento
- `mensagem:enviar` - Enviar mensagem para o cliente
- `conversa:finalizar` - Finalizar conversa
- `conversa:transferir` - Transferir conversa para outro setor
- `digitando:inicio` e `digitando:fim` - Indicadores de digitação
- `comando:opcoes` - Receber opções para comandos
- `template:conteudo` - Receber conteúdo de template

## Ambientes

O sistema é projetado para funcionar em dois ambientes:

### Desenvolvimento (dev)
- Porta HTTP: 3100
- Porta Socket: 3101
- URL: http://api.dominio.com:8080/
- Database: wpp-multiatendimento-dev

### Produção (main)
- Porta HTTP: 3001
- Porta Socket: 3002
- URL: https://api.dominio.com/
- Database: wpp-multiatendimento-main

## Escalabilidade e Performance

O sistema foi projetado pensando em:
- Índices otimizados no MongoDB para consultas eficientes
- Sistema de salas no WebSocket para reduzir broadcasts desnecessários
- Heartbeat para conexões persistentes
- Otimizações para suportar grande volume de mensagens

## Licença

Este projeto é propriedade da GM Partners.
