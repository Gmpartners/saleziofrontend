/**
 * Utilitário para conceder acesso a todos os setores para usuários admin
 */

/**
 * Verifica se um usuário é administrador e deve ter acesso a todos os setores
 * @param {Object} userProfile - Perfil do usuário
 * @returns {Boolean} - Retorna true se o usuário deve ter acesso privilegiado
 */
export const shouldHaveFullAccess = (userProfile) => {
  if (!userProfile) return false;
  
  // Verificar se é admin
  if (userProfile.role === 'admin') return true;
  
  // Verificar ID específico que deve ter acesso total
  if (userProfile.id === 'jaGLB04wZ3TgZisjIm4xN6hoIjI2') return true;
  
  return false;
};

/**
 * Cria um setor virtual para usuários admin quando não há setores disponíveis
 * @returns {Object} - Setor virtual para admins
 */
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

/**
 * Hook para processar a resposta da API de setores para usuários admin
 * @param {Object} apiResponse - Resposta original da API
 * @param {Object} userProfile - Perfil do usuário
 * @returns {Object} - Resposta processada com acesso ampliado para admins
 */
export const processSetoresResponseForAdmin = (apiResponse, userProfile) => {
  // Se não for admin ou não tiver acesso privilegiado, retornar resposta original
  if (!shouldHaveFullAccess(userProfile)) {
    return apiResponse;
  }
  
  // Se já tiver setores, apenas adicionar o setor admin
  if (apiResponse.success && Array.isArray(apiResponse.data) && apiResponse.data.length > 0) {
    // Verificar se o setor admin já existe
    const hasAdminSetor = apiResponse.data.some(setor => setor._id === 'admin-all-sectors');
    
    if (!hasAdminSetor) {
      return {
        ...apiResponse,
        data: [createAdminSetor(), ...apiResponse.data]
      };
    }
    
    return apiResponse;
  }
  
  // Caso não tenha setores, criar um setor admin
  return {
    success: true,
    data: [createAdminSetor()]
  };
};
