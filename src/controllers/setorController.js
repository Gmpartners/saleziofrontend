import { multiflowApi } from '../services/multiflowApi';

class SetorController {
  constructor() {
    this.multiflowApi = multiflowApi;
  }

  async getSetores(userId, isAdmin = false, allUsers = false) {
    try {
      return await this.multiflowApi.getSetores(userId, isAdmin, allUsers);
    } catch (error) {
      console.error('Erro ao buscar setores:', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  async getSetorById(setorId, userId, isAdmin = false) {
    try {
      return await this.multiflowApi.getSetorById(setorId, userId, isAdmin);
    } catch (error) {
      console.error(`Erro ao buscar setor ${setorId}:`, error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async createSetor(setorData, userId, isAdmin = false) {
    try {
      if (!setorData.nome) {
        return {
          success: false,
          error: 'Nome do setor é obrigatório'
        };
      }

      return await this.multiflowApi.createSetor(setorData, userId, isAdmin);
    } catch (error) {
      console.error('Erro ao criar setor:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateSetor(setorId, setorData, userId, isAdmin = false) {
    try {
      if (!setorId) {
        return {
          success: false,
          error: 'ID do setor é obrigatório'
        };
      }

      return await this.multiflowApi.updateSetor(setorId, setorData, userId, isAdmin);
    } catch (error) {
      console.error(`Erro ao atualizar setor ${setorId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateSetorDetalhado(setorId, setorData, userId, isAdmin = false) {
    try {
      if (!setorId) {
        return {
          success: false,
          error: 'ID do setor é obrigatório'
        };
      }

      return await this.multiflowApi.updateSetorDetalhado(setorId, setorData, userId, isAdmin);
    } catch (error) {
      console.error(`Erro ao atualizar setor ${setorId} com detalhes:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async deleteSetor(setorId, userId, isAdmin = false) {
    try {
      if (!setorId) {
        return {
          success: false,
          error: 'ID do setor é obrigatório'
        };
      }

      return await this.multiflowApi.deleteSetor(setorId, userId, isAdmin);
    } catch (error) {
      console.error(`Erro ao excluir setor ${setorId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async syncSetor(setorId, userId, isAdmin = false) {
    try {
      if (!setorId) {
        return {
          success: false,
          error: 'ID do setor é obrigatório'
        };
      }

      return await this.multiflowApi.forceSyncSetor(setorId, userId, isAdmin);
    } catch (error) {
      console.error(`Erro ao sincronizar setor ${setorId}:`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async validarDadosSetor(setorData) {
    const erros = [];

    if (!setorData.nome) {
      erros.push('Nome do setor é obrigatório');
    } else if (setorData.nome.length < 3) {
      erros.push('Nome do setor deve ter pelo menos 3 caracteres');
    }

    if (setorData.descricao && setorData.descricao.length > 500) {
      erros.push('Descrição do setor deve ter no máximo 500 caracteres');
    }

    if (setorData.contexto && setorData.contexto.length > 2000) {
      erros.push('Contexto do setor deve ter no máximo 2000 caracteres');
    }

    if (setorData.palavrasChave && !Array.isArray(setorData.palavrasChave)) {
      erros.push('Palavras-chave devem ser fornecidas como um array');
    }

    return {
      valido: erros.length === 0,
      erros
    };
  }
}

const setorController = new SetorController();
export default setorController;