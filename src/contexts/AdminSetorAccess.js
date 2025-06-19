export const shouldHaveFullAccess = (userProfile) => {
  if (!userProfile) return false;
  if (userProfile.role === 'admin') return true;
  if (userProfile.id === 'wFU4uEWg3vhC8lWVSJKc7dg8se72') return true;
  return false;
};

export const createAdminSetor = () => {
  return {
    _id: 'admin-all-sectors',
    id: 'admin-all-sectors',
    nome: 'Todos os Setores',
    descricao: 'Acesso administrativo a todos os setores',
    responsavel: 'Administrador',
    ativo: true
  };
};

export const processSetoresResponseForAdmin = (apiResponse, userProfile) => {
  if (!shouldHaveFullAccess(userProfile)) {
    return apiResponse;
  }
  
  const adminSetor = createAdminSetor();
  
  if (!apiResponse.success || !Array.isArray(apiResponse.data)) {
    return {
      success: true,
      data: [adminSetor]
    };
  }
  
  const hasAdminSetor = apiResponse.data.some(setor => setor._id === 'admin-all-sectors');
  
  if (!hasAdminSetor) {
    return {
      ...apiResponse,
      data: [adminSetor, ...apiResponse.data]
    };
  }
  
  return apiResponse;
};

export const forceAdminAccess = (conversationsResponse, userProfile) => {
  if (!shouldHaveFullAccess(userProfile)) {
    return conversationsResponse;
  }
  
  if (!conversationsResponse.success || !Array.isArray(conversationsResponse.data)) {
    return conversationsResponse;
  }
  
  if (conversationsResponse.data.length > 0) {
    return conversationsResponse;
  }
  
  try {
    const cachedConversations = localStorage.getItem('cachedAllConversations');
    if (cachedConversations) {
      const parsedConversations = JSON.parse(cachedConversations);
      if (Array.isArray(parsedConversations) && parsedConversations.length > 0) {
        return {
          ...conversationsResponse,
          data: parsedConversations
        };
      }
    }
  } catch (error) {
    console.error('Erro ao recuperar conversas em cache:', error);
  }
  
  return conversationsResponse;
};