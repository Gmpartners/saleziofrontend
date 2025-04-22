# WhatsApp Multi-atendimento

Sistema de multiatendimento via WhatsApp com triagem automatizada por IA e comunicação em tempo real.

## Funcionalidades

- **Triagem Inteligente**: Identificação automática do setor mais adequado para cada conversa
- **Transferência Entre Setores**: Sugestão automática e transferência facilitada entre departamentos
- **Atendimento em Tempo Real**: Notificações instantâneas de novas mensagens para atendentes
- **Interface CLI Interativa**: Terminal de atendimento completo para equipes de suporte
- **Comunicação Formatada**: Mensagens padronizadas mostrando setor e nome do atendente
- **Métricas de Atendimento**: Estatísticas e relatórios de performance
- **Integração com WhatsApp**: Suporte à API WhatsApp para envio e recebimento de mensagens

## Fluxo de Atendimento

1. **Recepção**: Cliente envia mensagem e é recebido com uma saudação automática
2. **Triagem**: O sistema analisa a mensagem e identifica o setor mais adequado
3. **Transferência**: Se necessário, o sistema sugere a transferência e aguarda confirmação do cliente
4. **Atendimento**: Atendentes do setor recebem notificações e podem responder em tempo real
5. **Finalização**: O atendente pode marcar a conversa como resolvida quando concluída

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
PORT=3100                                      # Porta para ambiente dev (3001 para produção)
BRANCH=dev                                     # Branch atual (dev ou main)
MONGODB_URI=mongodb://localhost:27017/wpp-multiatendimento-dev  # URI do MongoDB
OPENROUTER_API_KEY=sua-chave-api               # Chave da API OpenRouter para IA
OPENROUTER_MODEL=deepseek/deepseek-chat        # Modelo de IA a ser utilizado
API_TOKEN=seu-token-de-acesso                  # Token para autenticação na API
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

## CLI para Atendentes

O sistema inclui uma interface de linha de comando para atendentes que oferece atualização em tempo real, notificações de novas mensagens e formatação clara das conversas:

```bash
npm run cli
```

### Processo de atendimento:

1. Digite seu nome e selecione seu setor
2. Selecione a opção 1 para listar conversas ativas
3. Selecione a opção 2 e digite o número da conversa para atendê-la
4. Digite suas respostas diretamente no prompt que mostra "Setor - Seu Nome: "
5. As mensagens do cliente aparecerão automaticamente em tempo real
6. Use os comandos especiais conforme necessário

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

## Formato das Mensagens

O sistema formata automaticamente as mensagens enviadas pelos atendentes da seguinte forma:

```
*Setor - Nome do Atendente:*
Conteúdo da mensagem aqui
```

Essa formatação facilita a identificação pelos clientes de quem está respondendo e de qual departamento.

## API REST

### Autenticação

Todas as requisições devem incluir o header `x-api-token` com o token definido no arquivo `.env`.

### Endpoints

#### Setores

- `GET /api/setors` ou `GET /api/setores` - Listar todos os setores
- `POST /api/setors` - Criar novo setor
- `GET /api/setors/:id` - Obter setor por ID
- `PUT /api/setors/:id` - Atualizar setor
- `DELETE /api/setors/:id` - Excluir setor (desativação lógica)

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
- `nova_mensagem` - Receber notificação de nova mensagem
- `nova_conversa` - Receber notificação de nova conversa

## Scripts de Manutenção

### Limpar Conversas

Para limpar o banco de dados de conversas durante testes:

#### Método Interativo
```bash
cd /root/wpp-multiatendimento/dev  # ou /main para produção
node scripts/limpar-conversas.js
```

#### Método Automatizado
```bash
# Limpar todas as conversas
node scripts/limpar-conversas-auto.js all

# Limpar apenas conversas em andamento
node scripts/limpar-conversas-auto.js active

# Limpar conversas de um número específico
node scripts/limpar-conversas-auto.js phone 5521964738621
```

Estes scripts usam a variável MONGODB_URI do arquivo .env para determinar qual banco de dados limpar (dev ou main).

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

### Diferenças nos Webhooks
- Desenvolvimento: http://api.dominio.com:8080/api/webhook/whatsapp/alfa
- Produção: https://api.dominio.com/api/webhook/whatsapp/alfa

## Licença

Este projeto é propriedade da GM Partners.
