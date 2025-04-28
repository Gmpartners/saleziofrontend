# Instruções para Sincronização com a API MultiFlow

Este documento contém instruções sobre como usar a nova implementação para sincronizar seu setor com a API MultiFlow.

## Mudanças implementadas

1. **Atualização do método de autenticação**
   - Agora usando `x-api-token` em vez de `X-API-Key` e `Authorization`
   - Token da API mantido como `netwydZWjrJpA`

2. **Implementação com endpoints corretos**
   - Substituição dos endpoints inexistentes por endpoints documentados
   - Uso dos métodos HTTP corretos conforme a documentação

3. **Novo serviço de API dedicado**
   - Implementação de um serviço específico para a API MultiFlow
   - Suporte a cache e fallback para melhorar a experiência

4. **Atualização do Context para setor**
   - Suporte direto para o formato de dados que você já está usando
   - Sincronização automática do `setor` do usuário com a API

5. **WebSocket configurado corretamente**
   - Implementado seguindo a especificação da documentação
   - Suporte a salas e eventos em tempo real

## Como resolver o problema imediatamente

Você pode forçar a sincronização do seu setor usando o console do navegador após iniciar a aplicação:

1. Abra o console do navegador (F12 ou Clique com botão direito > Inspecionar > Console)
2. Cole o seguinte código:

```javascript
// Importar a função
import('/src/utils/forceSync.js').then(module => {
  // Executar a função para o usuário atual
  module.forceSyncUserSector().then(result => {
    console.log('Resultado da sincronização:', result);
  });
});
```

Alternativamente, você pode usar a função `forceSyncUserSector` que será disponibilizada diretamente no escopo global após importar o arquivo:

```javascript
// Após a primeira execução da importação acima
window.forceSyncUserSector().then(console.log);
```

## Como testar a integração

Para verificar se a integração está funcionando corretamente:

1. **Verificar conexão com a API**
   ```javascript
   const auth = document.querySelector('[data-auth-context]').__reactFiber$.memoizedProps.value;
   auth.api.checkHealth().then(console.log);
   ```

2. **Verificar setores disponíveis**
   ```javascript
   const auth = document.querySelector('[data-auth-context]').__reactFiber$.memoizedProps.value;
   auth.api.getSetores().then(console.log);
   ```

3. **Verificar o setor do usuário atual**
   ```javascript
   const auth = document.querySelector('[data-auth-context]').__reactFiber$.memoizedProps.value;
   console.log('Setor do usuário:', auth.userSetor);
   ```

## Utilizando os novos serviços em seus componentes

### Exemplo: Listar setores em um componente

```jsx
import React, { useEffect, useState } from 'react';
import { useAuthContext } from '../hooks/useAuthContext';

function SetoresComponent() {
  const { api } = useAuthContext();
  const [setores, setSetores] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    api.getSetores()
      .then(response => {
        if (response.success && Array.isArray(response.data)) {
          setSetores(response.data);
        } else {
          console.error('Erro ao buscar setores:', response);
        }
        setLoading(false);
      })
      .catch(error => {
        console.error('Erro ao buscar setores:', error);
        setLoading(false);
      });
  }, [api]);
  
  if (loading) return <div>Carregando setores...</div>;
  
  return (
    <div>
      <h2>Setores disponíveis</h2>
      <ul>
        {setores.map(setor => (
          <li key={setor._id}>
            {setor.nome} - {setor.responsavel}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

### Exemplo: Atualizar o setor do usuário

```jsx
import React, { useState } from 'react';
import { useAuthContext } from '../hooks/useAuthContext';

function AtualizarSetorForm() {
  const { userProfile, updateUserSector } = useAuthContext();
  const [nome, setNome] = useState(userProfile?.setor?.nome || '');
  const [responsavel, setResponsavel] = useState(userProfile?.setor?.responsavel || '');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    
    try {
      const result = await updateUserSector(userProfile.id, {
        id: userProfile?.setor?.id || `setor-${Date.now()}`,
        nome,
        responsavel,
        descricao: `Setor ${nome}`,
        ativo: true
      });
      
      setMessage('Setor atualizado com sucesso!');
      console.log('Resultado:', result);
    } catch (error) {
      setMessage(`Erro: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <h2>Atualizar setor</h2>
      
      <div>
        <label>
          Nome do setor:
          <input 
            type="text" 
            value={nome} 
            onChange={(e) => setNome(e.target.value)}
            required 
          />
        </label>
      </div>
      
      <div>
        <label>
          Responsável:
          <input 
            type="text" 
            value={responsavel} 
            onChange={(e) => setResponsavel(e.target.value)}
            required 
          />
        </label>
      </div>
      
      <button type="submit" disabled={loading}>
        {loading ? 'Atualizando...' : 'Atualizar setor'}
      </button>
      
      {message && <p>{message}</p>}
    </form>
  );
}
```

## Troubleshooting

Se você encontrar problemas na integração, verifique os seguintes pontos:

1. **Erros 401 (Não autorizado)**
   - Confirme se o token da API está correto em `.env`: `VITE_API_TOKEN=netwydZWjrJpA`
   - Verifique se o header `x-api-token` está sendo enviado corretamente

2. **Erros ao buscar ou criar setores**
   - Verifique o formato do campo `setor` no documento do usuário
   - Confirme se o userId está sendo passado corretamente nas requisições

3. **WebSocket não conecta**
   - Verifique se a URL do WebSocket está correta em `.env`: `VITE_SOCKET_URL=https://multi.compracomsegurancaeconfianca.com`
   - Confirme se os dados de autenticação estão sendo enviados corretamente

4. **Logs para diagnóstico**
   - As atualizações adicionaram logs detalhados no console
   - Verifique estes logs para identificar problemas específicos

Se o problema persistir, use a função `repairUserSync` para tentar corrigir automaticamente:

```javascript
const auth = document.querySelector('[data-auth-context]').__reactFiber$.memoizedProps.value;
auth.repairUserSync(auth.userProfile.id).then(console.log);
```

## Próximos passos

1. **Criar componentes dedicados** para gerenciamento de setores
2. **Implementar um painel de administração** para configuração e monitoramento
3. **Melhorar a integração do WebSocket** para notificações em tempo real
4. **Adicionar suporte a múltiplos setores** para usuários administradores