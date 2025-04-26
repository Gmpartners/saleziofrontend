# Guia de Implementação da Setorização no MultiFlow

Este documento descreve as etapas para implementar o sistema de setorização no projeto MultiFlow, permitindo a divisão de usuários por setores e controle de acesso baseado em papéis.

## 1. Mudanças Implementadas

Foram realizadas as seguintes alterações para habilitar a setorização:

- **Modelo de Dados**: Atualizado o modelo de usuário para incluir campos de setorização
- **Autenticação**: Modificado o contexto de autenticação para fornecer informações de setor
- **Middlewares**: Implementado middleware para controle de acesso baseado em papel de usuário
- **Firebase Functions**: Atualizadas funções para sincronização de setores e usuários
- **Interface de Usuário**: Atualizada para exibir apenas o conteúdo relevante ao setor do usuário

## 2. Estrutura do Documento de Usuário

O documento de usuário no Firestore agora tem a seguinte estrutura:

```javascript
{
  // IDs e informações básicas
  id: "user123",                // ID do usuário
  email: "usuario@exemplo.com", // Email do usuário
  displayName: "Nome Completo", // Nome de exibição (IMPORTANTE: usar displayName, não name)
  
  // Campos para setorização
  role: "agent",                // "agent" ou "admin"
  sector: "setor-id",           // ID do setor (referência)
  sectorName: "Nome do Setor",  // Nome do setor para exibição
  
  // Status
  isActive: true,               // Status ativo/inativo
  
  // Outros campos
  phoneNumber: "+5511999999999",
  companyName: "Empresa",
  jobTitle: "Cargo",
  
  // Datas
  createdAt: timestamp,
  updatedAt: timestamp,
  lastLogin: timestamp
}
```

## 3. Execução da Migração de Dados

Para migrar usuários existentes para o novo formato, você precisa:

1. Implantar a função Firebase `migrateUsersToSectorized`:

```bash
firebase deploy --only functions:migrateUsersToSectorized
```

2. Executar a migração via HTTP ou via Console:

**Via HTTP:**
```bash
curl -X POST https://your-region-your-project.cloudfunctions.net/migrateUsersToSectorized \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

**Via Console Firebase:**
Acesse o Console Firebase, vá para Functions e clique no botão "Run now" da função `runUserMigration`.

## 4. Verificação da Implementação

Após concluir as alterações, verifique se:

1. Os usuários estão sendo criados com os campos de setorização
2. Administradores podem ver todas as conversas
3. Usuários regulares veem apenas as conversas do seu setor
4. A barra lateral mostra o setor do usuário
5. O gerenciamento de usuários permite atribuir setores aos usuários

## 5. Configuração de Usuários

### Criando um Administrador

Para criar um administrador manualmente:

```javascript
// No console do Firebase ou em um script Admin SDK
await admin.firestore().collection('users').doc('USER_ID').update({
  role: 'admin',
  updatedAt: admin.firestore.FieldValue.serverTimestamp()
});
```

### Atribuindo Usuário a um Setor

Para atribuir um usuário a um setor manualmente:

```javascript
// No console do Firebase ou em um script Admin SDK
await admin.firestore().collection('users').doc('USER_ID').update({
  sector: 'SETOR_ID',
  sectorName: 'Nome do Setor',
  updatedAt: admin.firestore.FieldValue.serverTimestamp()
});
```

## 6. Resolução de Problemas

### Problemas Comuns

1. **Erro de importação**: Se ocorrer erro ao importar `RequireAdmin`, verifique se está usando a extensão `.jsx` correta.

2. **Campos inconsistentes**: Certifique-se de que está usando `displayName` em vez de `name`.

3. **Filtro de conversas não funciona**: Verifique se `userSector` está sendo passado corretamente para o componente `ConversationsList`.

### Depuração

Para depurar problemas na setorização:

1. Verifique os logs do Firebase Functions para confirmar a sincronização
2. Inspecione o documento do usuário diretamente no console do Firestore
3. Use `console.log` no contexto de autenticação para verificar se os dados do usuário estão sendo carregados corretamente

## 7. Próximos Passos

Para aprimorar ainda mais a setorização:

1. Implementar relatórios por setor
2. Adicionar notificações específicas por setor
3. Criar uma página de configuração de setores mais detalhada

---

Se precisar de mais ajuda ou tiver dúvidas sobre a implementação, consulte a documentação ou entre em contato com a equipe de desenvolvimento.