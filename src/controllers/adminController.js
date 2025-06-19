const { multiflowApi } = require('../services/multiflowApi');

class AdminController {
  constructor() {
    this.multiflowApi = multiflowApi;
  }

  async getAllConversas(filters = {}, userId) {
    try {
      return await this.multiflowApi.getAllConversasAdmin(filters, userId);
    } catch (error) {
      console.error('Erro ao buscar todas as conversas (admin):', error);
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  async getConversaById(conversaId, userId) {
    try {
      return await this.multiflowApi.getConversaAdmin(conversaId, userId);
    } catch (error) {
      console.error(`Erro ao buscar conversa ${conversaId} (admin):`, error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async getEstatisticas(userId) {
    try {
      return await this.multiflowApi.getAdminEstatisticas(userId);
    } catch (error) {
      console.error('Erro ao buscar estatísticas (admin):', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  async transferirConversa(conversaId, setorId, userId, motivo = '') {
    try {
      return await this.multiflowApi.transferirConversa(conversaId, setorId, userId, motivo, true);
    } catch (error) {
      console.error(`Erro ao transferir conversa ${conversaId} (admin):`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async finalizarConversa(conversaId, userId) {
    try {
      return await this.multiflowApi.finalizarConversa(conversaId, userId, true);
    } catch (error) {
      console.error(`Erro ao finalizar conversa ${conversaId} (admin):`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async arquivarConversa(conversaId, userId) {
    try {
      return await this.multiflowApi.arquivarConversa(conversaId, userId, true);
    } catch (error) {
      console.error(`Erro ao arquivar conversa ${conversaId} (admin):`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async desarquivarConversa(conversaId, userId) {
    try {
      return await this.multiflowApi.desarquivarConversa(conversaId, userId, true);
    } catch (error) {
      console.error(`Erro ao desarquivar conversa ${conversaId} (admin):`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async enviarMensagem(conversaId, conteudo, userId, tipo = "texto") {
    try {
      return await this.multiflowApi.enviarMensagem(conversaId, conteudo, userId, tipo, true);
    } catch (error) {
      console.error(`Erro ao enviar mensagem para conversa ${conversaId} (admin):`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  async updateStatus(conversaId, status, userId, atendenteId = null) {
    try {
      return await this.multiflowApi.updateStatus(conversaId, status, userId, atendenteId, true);
    } catch (error) {
      console.error(`Erro ao atualizar status da conversa ${conversaId} (admin):`, error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

const adminController = new AdminController();
export default adminController;