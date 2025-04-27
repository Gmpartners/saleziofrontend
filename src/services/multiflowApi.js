import axios from 'axios';
import { API_URL, API_TOKEN, AUTH_HEADER, API_ENDPOINTS } from '../config/syncConfig';

/**
 * Serviço para comunicação com a API MultiFlow
 */
class MultiflowApiService {
  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
        [AUTH_HEADER]: API_TOKEN
      },
      timeout: 10000 // 10 segundos
    });
    
    // Cache para armazenar respostas
    this.cache = {};
    this.setoresCache = null;
  }

  /**
   * Obtém o ID do usuário do localStorage
   */
  getUserId() {
    return localStorage.getItem('userId') || '';
  }

  /**
   * Recupera todos os setores do usuário
   */
  async getSetores(userId = this.getUserId()) {
    try {
      console.log(`Buscando setores para o usuário: ${userId}`);
      
      // Verificar cache
      const cacheKey = `setores-${userId}`;
      if (this.cache[cacheKey] && Date.now() - this.cache[cacheKey].timestamp < 60000) {
        console.log('Usando cache de setores');
        return this.cache[cacheKey].data;
      }
      
      const response = await this.api.get(API_ENDPOINTS.getSetores(userId));
      
      // Armazenar em cache
      this.cache[cacheKey] = {
        data: response.data,
        timestamp: Date.now()
      };
      
      // Atualizar cache de setores
      if (response.data.success && Array.isArray(response.data.data)) {
        this.setoresCache = response.data.data;
      }
      
      console.log(`Setores obtidos com sucesso: ${response.data.data?.length || 0} setores`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar setores:', error.message);
      
      // Retornar dados de fallback em caso de erro
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Obtém um setor específico pelo ID
   */
  async getSetorById(setorId, userId = this.getUserId()) {
    try {
      console.log(`Buscando setor ${setorId} para o usuário: ${userId}`);
      
      // Verificar cache
      const cacheKey = `setor-${userId}-${setorId}`;
      if (this.cache[cacheKey] && Date.now() - this.cache[cacheKey].timestamp < 60000) {
        console.log('Usando cache de setor');
        return this.cache[cacheKey].data;
      }
      
      const response = await this.api.get(API_ENDPOINTS.getSetor(userId, setorId));
      
      // Armazenar em cache
      this.cache[cacheKey] = {
        data: response.data,
        timestamp: Date.now()
      };
      
      console.log(`Setor obtido com sucesso: ${response.data.data?.nome || 'N/A'}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar setor ${setorId}:`, error.message);
      
      // Retornar dados de fallback em caso de erro
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Cria um novo setor
   */
  async createSetor(setorData, userId = this.getUserId()) {
    try {
      console.log(`Criando setor para o usuário: ${userId}`, setorData);
      
      const payload = {
        nome: setorData.nome,
        descricao: setorData.descricao || `Setor ${setorData.nome}`,
        responsavel: setorData.responsavel || "Administrador",
        ativo: setorData.ativo !== false
      };
      
      const response = await this.api.post(API_ENDPOINTS.createSetor(userId), payload);
      
      // Invalidar cache de setores
      delete this.cache[`setores-${userId}`];
      this.setoresCache = null;
      
      console.log(`Setor criado com sucesso: ${response.data.data?._id || 'N/A'}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar setor:', error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Atualiza um setor existente
   */
  async updateSetor(setorId, setorData, userId = this.getUserId()) {
    try {
      console.log(`Atualizando setor ${setorId} para o usuário: ${userId}`, setorData);
      
      const payload = {
        nome: setorData.nome,
        descricao: setorData.descricao,
        responsavel: setorData.responsavel,
        ativo: setorData.ativo
      };
      
      // Remover campos undefined
      Object.keys(payload).forEach(key => payload[key] === undefined && delete payload[key]);
      
      const response = await this.api.put(API_ENDPOINTS.updateSetor(userId, setorId), payload);
      
      // Invalidar cache de setores
      delete this.cache[`setores-${userId}`];
      delete this.cache[`setor-${userId}-${setorId}`];
      this.setoresCache = null;
      
      console.log(`Setor atualizado com sucesso: ${response.data.data?.nome || 'N/A'}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao atualizar setor ${setorId}:`, error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Exclui um setor
   */
  async deleteSetor(setorId, userId = this.getUserId()) {
    try {
      console.log(`Excluindo setor ${setorId} para o usuário: ${userId}`);
      
      const response = await this.api.delete(API_ENDPOINTS.deleteSetor(userId, setorId));
      
      // Invalidar cache de setores
      delete this.cache[`setores-${userId}`];
      delete this.cache[`setor-${userId}-${setorId}`];
      this.setoresCache = null;
      
      console.log(`Setor excluído com sucesso: ${setorId}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao excluir setor ${setorId}:`, error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Obtém lista de conversas com filtros opcionais
   */
  async getConversas(filters = {}, userId = this.getUserId()) {
    try {
      console.log(`Buscando conversas para o usuário: ${userId}`, filters);
      
      // Construir parâmetros de consulta
      const params = {};
      
      if (filters.status) {
        if (Array.isArray(filters.status)) {
          params.status = filters.status.join(',');
        } else {
          params.status = filters.status;
        }
      }
      
      if (filters.setorId) {
        params.setorId = filters.setorId;
      }
      
      if (filters.arquivada !== undefined) {
        params.arquivada = filters.arquivada;
      }
      
      params.page = filters.page || 1;
      params.limit = filters.limit || 20;
      
      // Cache key baseado nos filtros
      const cacheKey = `conversas-${userId}-${JSON.stringify(params)}`;
      
      // Para garantir que temos sempre os dados mais atualizados, não usaremos cache por enquanto
      // if (this.cache[cacheKey] && Date.now() - this.cache[cacheKey].timestamp < 30000) {
      //   console.log('Usando cache de conversas');
      //   return this.cache[cacheKey].data;
      // }
      
      const response = await this.api.get(API_ENDPOINTS.getConversas(userId), { params });
      
      // Armazenar em cache
      this.cache[cacheKey] = {
        data: response.data,
        timestamp: Date.now()
      };
      
      console.log(`Conversas obtidas com sucesso: ${response.data.data?.length || 0} conversas`);
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar conversas:', error.message);
      
      return {
        success: false,
        error: error.message,
        data: []
      };
    }
  }

  /**
   * Obtém uma conversa específica pelo ID
   */
  async getConversa(conversaId, userId = this.getUserId()) {
    try {
      console.log(`Buscando detalhes da conversa ${conversaId} para o usuário: ${userId}`);
      
      // Cache key para esta conversa específica
      const cacheKey = `conversa-${userId}-${conversaId}`;
      
      // Não usaremos cache para recuperar a conversa, para garantir dados atualizados
      // if (this.cache[cacheKey] && Date.now() - this.cache[cacheKey].timestamp < 10000) {
      //   console.log('Usando cache de conversa');
      //   return this.cache[cacheKey].data;
      // }
      
      const response = await this.api.get(API_ENDPOINTS.getConversa(userId, conversaId));
      
      // Armazenar em cache
      this.cache[cacheKey] = {
        data: response.data,
        timestamp: Date.now()
      };
      
      console.log(`Detalhes da conversa obtidos com sucesso: ${conversaId}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar detalhes da conversa ${conversaId}:`, error.message);
      
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Envia uma mensagem em uma conversa
   */
  async enviarMensagem(conversaId, conteudo, userId = this.getUserId()) {
    try {
      console.log(`Enviando mensagem para conversa ${conversaId}`);
      
      const response = await this.api.post(
        API_ENDPOINTS.addMensagem(userId, conversaId),
        { conteudo }
      );
      
      // Invalidar cache relacionado a esta conversa
      const cacheKeysToInvalidate = Object.keys(this.cache).filter(key => 
        key.includes(`conversa-${userId}-${conversaId}`) || key.includes(`conversas-${userId}`)
      );
      
      cacheKeysToInvalidate.forEach(key => delete this.cache[key]);
      
      console.log('Mensagem enviada com sucesso');
      return response.data;
    } catch (error) {
      console.error(`Erro ao enviar mensagem para conversa ${conversaId}:`, error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Atualiza o status de uma conversa
   */
  async updateStatus(conversaId, status, userId = this.getUserId()) {
    try {
      console.log(`Atualizando status da conversa ${conversaId} para: ${status}`);
      
      const response = await this.api.put(
        API_ENDPOINTS.updateStatus(userId, conversaId),
        { status }
      );
      
      // Invalidar cache relacionado a esta conversa
      const cacheKeysToInvalidate = Object.keys(this.cache).filter(key => 
        key.includes(`conversa-${userId}-${conversaId}`) || key.includes(`conversas-${userId}`)
      );
      
      cacheKeysToInvalidate.forEach(key => delete this.cache[key]);
      
      console.log(`Status da conversa atualizado com sucesso: ${status}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao atualizar status da conversa ${conversaId}:`, error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Transfere uma conversa para outro setor
   */
  async transferirConversa(conversaId, setorId, userId = this.getUserId()) {
    try {
      console.log(`Transferindo conversa ${conversaId} para setor ${setorId}`);
      
      const response = await this.api.put(
        API_ENDPOINTS.transferirConversa(userId, conversaId),
        { setorId }
      );
      
      // Invalidar cache relacionado a esta conversa
      const cacheKeysToInvalidate = Object.keys(this.cache).filter(key => 
        key.includes(`conversa-${userId}-${conversaId}`) || key.includes(`conversas-${userId}`)
      );
      
      cacheKeysToInvalidate.forEach(key => delete this.cache[key]);
      
      console.log('Conversa transferida com sucesso');
      return response.data;
    } catch (error) {
      console.error(`Erro ao transferir conversa ${conversaId}:`, error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Verifica o status de saúde da API
   */
  async checkHealth() {
    try {
      // A documentação não menciona um endpoint de health, mas vamos tentar a rota base
      const response = await this.api.get('/', { timeout: 5000 });
      return response.status < 300;
    } catch (error) {
      console.error('Erro ao verificar saúde da API:', error.message);
      return false;
    }
  }
}

export const multiflowApi = new MultiflowApiService();