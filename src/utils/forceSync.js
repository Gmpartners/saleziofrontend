/**
 * Utilitário para forçar a sincronização do setor do usuário
 * Este arquivo pode ser executado diretamente no console do navegador
 */

/**
 * Força a sincronização do setor do usuário com a API
 * @param {string} userId - ID do usuário (opcional, usa o atual se não fornecido)
 * @returns {Promise<Object>} - Resultado da sincronização
 */
export async function forceSyncUserSector(userId = null) {
  try {
    // Obter o contexto de autenticação
    let auth;
    
    // Tentar diferentes métodos de encontrar o contexto
    if (typeof window !== 'undefined') {
      // Método 1: Procurar elemento com o contexto
      const authElement = document.querySelector('[data-auth-context]');
      if (authElement && authElement.__reactFiber$) {
        auth = authElement.__reactFiber$.memoizedProps.value;
      }
      
      // Método 2: Usar o contexto do global
      if (!auth && window.__AUTH_CONTEXT__) {
        auth = window.__AUTH_CONTEXT__;
      }
      
      // Método 3: Se estiver usando react-query, pode estar no cache
      if (!auth && window.__REACT_QUERY_GLOBAL_CACHE__) {
        auth = window.__REACT_QUERY_GLOBAL_CACHE__.queries.find(q => 
          q.queryKey && q.queryKey[0] === 'authContext'
        )?.state?.data;
      }
    }
    
    if (!auth) {
      throw new Error("Contexto de autenticação não encontrado");
    }
    
    // Usar o ID fornecido ou o do usuário atual
    const targetUserId = userId || auth.userProfile?.id || localStorage.getItem('userId');
    
    if (!targetUserId) {
      throw new Error("ID do usuário não fornecido e não há usuário autenticado");
    }
    
    console.log(`Forçando sincronização do setor para o usuário: ${targetUserId}`);
    
    // Verificar se o usuário tem um setor configurado
    const userSetor = auth.userProfile?.setor;
    
    if (!userSetor) {
      console.warn("O usuário não tem um setor configurado");
      return { success: false, message: "Usuário sem setor" };
    }
    
    console.log("Dados do setor encontrados:", userSetor);
    
    // Forçar sincronização usando a API
    if (auth.api) {
      // Usar o serviço API se disponível
      const setoresResult = await auth.api.getSetores(targetUserId);
      console.log("Resultado da busca de setores:", setoresResult);
      
      // Verificar se o setor já existe na API
      let setorExistente = null;
      if (setoresResult.success && Array.isArray(setoresResult.data)) {
        setorExistente = setoresResult.data.find(s => 
          s.nome.toLowerCase() === userSetor.nome.toLowerCase() ||
          s._id === userSetor._id ||
          s._id === userSetor.id
        );
      }
      
      if (setorExistente) {
        console.log("Setor encontrado na API:", setorExistente);
        
        // Atualizar o ID do setor no Firebase com o ID da API
        if (auth.updateUserSector) {
          const updateResult = await auth.updateUserSector(targetUserId, {
            ...userSetor,
            _id: setorExistente._id
          });
          console.log("Setor atualizado com sucesso:", updateResult);
          return { success: true, message: "Setor atualizado com ID da API", data: updateResult };
        }
      } else {
        // Setor não existe, criar
        console.log("Setor não encontrado na API, criando...");
        
        const createResult = await auth.api.createSetor({
          nome: userSetor.nome,
          descricao: userSetor.descricao || `Setor ${userSetor.nome}`,
          responsavel: userSetor.responsavel || "Administrador",
          ativo: userSetor.ativo !== false
        }, targetUserId);
        
        console.log("Resultado da criação do setor:", createResult);
        
        if (createResult.success && createResult.data) {
          // Atualizar o ID do setor no Firebase com o ID da API
          if (auth.updateUserSector) {
            const updateResult = await auth.updateUserSector(targetUserId, {
              ...userSetor,
              _id: createResult.data._id
            });
            console.log("Setor criado e atualizado com sucesso:", updateResult);
            return { success: true, message: "Novo setor criado na API", data: updateResult };
          }
        }
      }
    }
    
    // Usar o repairUserSync como fallback
    if (auth.repairUserSync) {
      const result = await auth.repairUserSync(targetUserId);
      console.log("Resultado da reparação de sincronização:", result);
      return result;
    }
    
    throw new Error("Não foi possível sincronizar o setor, funções necessárias não encontradas");
  } catch (error) {
    console.error("Erro ao forçar sincronização:", error);
    return { success: false, error: error.message };
  }
}

// Exportar para uso global (útil para execução via console)
if (typeof window !== 'undefined') {
  window.forceSyncUserSector = forceSyncUserSector;
}

// Instruções de uso no console
console.log(`
Para sincronizar o setor do usuário atual, execute no console:
    forceSyncUserSector()

Para sincronizar o setor de um usuário específico:
    forceSyncUserSector('ID_DO_USUARIO')
`);
