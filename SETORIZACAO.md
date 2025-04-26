# Implementação do Sistema de Setorização para MultiFlow

Este documento descreve a implementação do sistema de setorização para a aplicação MultiFlow, permitindo a divisão de usuários por setores e controle de acesso baseado em papéis.

## Visão Geral da Arquitetura

O sistema de setorização implementado possui a seguinte arquitetura:

```
Firebase Auth/Firestore <--> Firebase Functions <--> API MultiFlow <--> Frontend React
       |                                                  |
       +---------------> Dados do Usuário <---------------+
                          (Setor, Papel)
```

## Componentes Principais

### 1. Modelo de Dados

#### 1.1. Usuário (Firestore)
```javascript
{
  // Coleção users/{userId}
  uid: "user123",
  email: "usuario@exemplo.com",
  displayName: "Nome do Usuário",
  role: "agent", // ou "admin"
  sector: "financeiro", // ID do setor atribuído
  sectorName: "Financeiro", // Nome legível do setor
  isActive: true,
  lastLogin: timestamp,
  createdAt: timestamp
}
```

#### 1.2. Setor (Firestore)
```javascript
{
  // Coleção sectors/{sectorId}
  _id: "financeiro",
  nome: "Financeiro",
  descricao: "Departamento financeiro",
  responsavel: "João Silva",
  ativo: true,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### 2. Firebase Functions

#### 2.1. Sincronização de Usuário
- `syncUserToMultiFlow`: Sincroniza alterações de usuário do Firestore para a API MultiFlow
- `syncSectorChangesToUsers`: Atualiza o nome do setor para todos os usuários quando o setor é atualizado

#### 2.2. Webhooks
- `syncSectorFromAPI`: Recebe atualizações de setor da API e atualiza o Firestore
- `conversationAssigned`: Recebe notificações quando uma conversa é atribuída a um setor

### 3. Componentes Frontend

#### 3.1. Sistema de Autenticação
- `AuthContext.jsx`: Contexto de autenticação que gerencia dados do usuário e seu setor
- `authMiddleware.jsx`: Middleware para controle de acesso baseado em papel (admin/agent)

#### 3.2. Interface do Usuário
- `app-sidebar.jsx`: Barra lateral que mostra/oculta itens com base no papel do usuário
- `ConversationsList.jsx`: Lista de conversas filtrada automaticamente pelo setor do usuário
- `UserProfile.jsx`: Página de perfil que mostra informações do usuário, incluindo seu setor

#### 3.3. Interface do Administrador
- `AdminDashboard.jsx`: Painel administrativo com visão geral do sistema
- `SectorManagement.jsx`: Gerenciamento de setores (CRUD)
- `UserManagement.jsx`: Gerenciamento de usuários e atribuição de setores

## Fluxo de Dados

1. **Autenticação de Usuário**:
   - Usuário faz login via Firebase Auth
   - O sistema busca dados adicionais do usuário no Firestore, incluindo setor
   - O contexto de autenticação carrega essas informações e disponibiliza para a aplicação

2. **Filtragem de Conversas**:
   - Para administradores: Todas as conversas são visíveis, com opção de filtrar por setor
   - Para agentes: Apenas conversas do seu setor são visíveis automaticamente

3. **Gerenciamento de Setores**:
   - Administrador cria/edita setores através da interface
   - Firebase Functions sincroniza alterações para a API MultiFlow
   - Quando um setor é renomeado, a função `syncSectorChangesToUsers` atualiza todos os usuários

4. **Gerenciamento de Usuários**:
   - Administrador atribui usuários a setores
   - Firebase Functions sincroniza alterações para a API MultiFlow
   - O usuário verá apenas as conversas pertencentes ao seu setor

## Implementação de Segurança

1. **Middleware de Autorização**:
   - `RequireAuth`: Verifica se o usuário está autenticado
   - `RequireAdmin`: Verifica se o usuário é administrador
   - `RequireSector`: Verifica se o usuário pertence a um setor específico

2. **Controle de Acesso na UI**:
   - A barra lateral mostra apenas os itens que o usuário tem permissão para acessar
   - Os filtros de conversas são automaticamente aplicados com base no setor do usuário

## Extensões Futuras

1. **Sistema de Notificações**:
   - Notificar usuários de um setor quando uma nova conversa é atribuída
   - Implementar notificações push para alertas em tempo real

2. **Métricas por Setor**:
   - Implementar relatórios e métricas específicas por setor
   - Permitir que administradores comparem desempenho entre setores

3. **Transferência de Conversas**:
   - Aprimorar o sistema de transferência de conversas entre setores
   - Adicionar opção de adicionar notas ao transferir

## Conclusão

A implementação do sistema de setorização permite que a aplicação MultiFlow escale para organizações maiores, com divisão clara de responsabilidades entre departamentos. Administradores têm visão completa do sistema, enquanto agentes focam apenas nas conversas relevantes para seu setor.