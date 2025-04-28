# Instruções para Implementação da Setorização

Implementamos todas as alterações necessárias para corrigir os problemas com a setorização no seu projeto. Este documento contém instruções detalhadas sobre as modificações feitas e como testá-las.

## Problemas Corrigidos

1. **Incompatibilidade de coleções**: Alteramos todas as referências de `sectors` para `setores` para alinhar com suas regras do Firestore.

2. **Compatibilidade de papéis (roles)**: Adicionamos mapeamento entre `agent` (usado no frontend) e `attendant` (usado nas regras do Firestore).

3. **Problemas com a API**: Implementamos tratamento de erros robusto para lidar com endpoints que podem não existir na API.

4. **Problemas de permissão**: Atualizamos as regras do Firestore para permitir acesso às coleções necessárias.

## Como Testar a Implementação

### 1. Atualizar as Regras do Firestore

Primeiro, implante as novas regras do Firestore que adicionamos:

```bash
firebase deploy --only firestore:rules
```

### 2. Implantar as Firebase Functions

```bash
firebase deploy --only functions
```

### 3. Testando a Implementação

1. **Acessar o gerenciamento de setores:**
   - Faça login como administrador
   - Navegue até a página de gerenciamento de setores
   - Verifique se os setores são carregados corretamente

2. **Criar um novo setor:**
   - Clique em "Novo Setor"
   - Preencha os campos e salve
   - Verifique se o setor aparece na lista

3. **Visualizar conversas por setor:**
   - Crie uma conversa associada a um setor específico
   - Verifique se apenas usuários desse setor (e administradores) podem ver a conversa

## Considerações sobre a API

Nossa implementação foi adaptada para trabalhar com sua API existente. Notamos que alguns endpoints de sincronização podem não estar implementados na API. Nesses casos, o sistema continuará funcionando sem a sincronização e exibirá uma mensagem indicando que a "API não está disponível para sincronização" ou "Endpoint não implementado".

Para habilitar a sincronização completa, sua API precisará implementar os seguintes endpoints:

1. `POST /sync/user` - Para sincronizar usuários
2. `POST /sync/sector` - Para sincronizar setores
3. `POST /sync/sector/:id/force` - Para forçar sincronização de um setor específico
4. `GET /health` - Para verificar o status da API

## Estrutura de Dados

### Coleção "setores"

```javascript
{
  _id: "financeiro-123456",
  nome: "Financeiro",
  descricao: "Setor financeiro",
  responsavel: "João Silva",
  ativo: true,
  userId: "user123",
  createdAt: timestamp,
  updatedAt: timestamp,
  // Campos de sincronização
  mongoId: "id_na_api", // opcional
  syncStatus: "success", // success, error, pending
  lastSyncedAt: timestamp
}
```

### Documento de usuário (users)

```javascript
{
  // Campos básicos
  id: "user123",
  email: "usuario@exemplo.com",
  displayName: "Nome do Usuário",
  
  // Campos de setorização
  role: "agent", // ou "admin"
  sector: "financeiro-123456", // ID do setor
  sectorName: "Financeiro", // Nome do setor para exibição
  
  // Campos de sincronização
  syncStatus: "success", // success, error, pending
  lastSyncedAt: timestamp
}
```

## Resolução de Problemas

### Problema: Erro de permissão "Missing or insufficient permissions"

**Solução:** Verifique se as regras do Firestore foram atualizadas corretamente. Se o problema persistir, verifique se o usuário tem o papel correto atribuído (`admin` ou `agent`).

### Problema: Erro 403 na API de sincronização

**Solução:** Verifique se o token de API está configurado corretamente no arquivo `.env`. O sistema vai continuar funcionando mesmo sem a sincronização com a API.

### Problema: Setores não aparecem no frontend

**Solução:** Confirme que os documentos estão sendo criados na coleção `setores` (não `sectors`). Se necessário, migre manualmente os dados de uma coleção para a outra.

## Próximos Passos

1. **Implementar endpoints na API**: Para habilitar a sincronização completa, implemente os endpoints mencionados acima na API.

2. **Melhorar o WebSocket**: O sistema está exibindo erros relacionados ao WebSocket não inicializado. Isso pode ser abordado em uma atualização futura.

3. **Expandir funcionalidades**: Adicionar recursos como métricas por setor, notificações específicas por setor, etc.

---

Se você tiver dúvidas ou problemas com a implementação, consulte os comentários no código ou entre em contato com a equipe de desenvolvimento.
