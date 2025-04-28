// services/api.js
import axios from 'axios';
import { MultiFlowStatusMap } from '../models/multiflow';

const API_URL = import.meta.env.VITE_API_URL || 'https://multi.compracomsegurancaeconfianca.com/api';
const API_TOKEN = import.meta.env.VITE_API_TOKEN || 'netwydZWjrJpA';

class ApiService {
  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': API_TOKEN
      },
      timeout: 10000 // Timeout de 10 segundos
    });
    
    // Cache para armazenar respostas
    this.cache = {};
    this.failedRequests = new Set();
    this.setoresCache = null;
    
    // Interceptor para tratar erros de resposta
    this.api.interceptors.response.use(
      (response) => response.data,
      (error) => {
        // Verificar se o erro tem uma resposta
        if (error.response) {
          console.error('API Error:', {
            status: error.response.status,
            data: error.response.data,
            url: error.config.url
          });
          
          const status = error.response.status;
          
          // Redirecionar para login apenas em caso de erro de autenticação não relacionado a API_KEY
          if ((status === 401 || status === 403) && 
              !error.config.url.includes('/health') && 
              error.response.data?.message?.toLowerCase().includes('token')) {
            localStorage.removeItem('authToken');
            // Manter o redirecionamento apenas para erros críticos de autenticação
            // window.location.href = '/login';
          }
          
          return Promise.reject(
            error.response?.data?.message || error.message || 'Ocorreu um erro na requisição'
          );
        } 
        // Erros de rede (sem resposta do servidor)
        else if (error.request) {
          console.error('API Network Error:', {
            message: error.message,
            url: error.config.url
          });
          
          return Promise.reject(
            'Erro de conexão com o servidor. Verifique sua internet ou tente novamente mais tarde.'
          );
        } 
        // Outros erros
        else {
          console.error('API Error:', error.message);
          return Promise.reject(error.message);
        }
      }
    );
  }

  // Obter o userId do localStorage para usar nas requisições
  getUserId() {
    return localStorage.getItem('userId') || 'test-user';
  }

  // Verificar se um endpoint já falhou antes
  _hasRequestFailed(endpoint) {
    return this.failedRequests.has(endpoint);
  }

  // Marcar endpoint como falho
  _markRequestAsFailed(endpoint) {
    this.failedRequests.add(endpoint);
    
    // Remover do conjunto de falhas após 5 minutos para permitir novas tentativas
    setTimeout(() => {
      this.failedRequests.delete(endpoint);
    }, 5 * 60 * 1000);
  }

  // Cache para evitar requisições repetidas
  async _cachedRequest(key, requestFn, fallbackData = null, ttl = 60000) {
    // Se o endpoint já falhou antes e o fallback está disponível, retorna o fallback imediatamente
    if (this._hasRequestFailed(key) && fallbackData !== null) {
      console.log(`Usando fallback para ${key} devido a falha anterior`);
      return {
        success: true,
        data: fallbackData,
        source: 'fallback'
      };
    }

    // Verificar se tem no cache e não expirou
    if (this.cache[key] && (Date.now() - this.cache[key].timestamp < ttl)) {
      console.log(`Usando cache para ${key}`);
      return {
        ...this.cache[key].data,
        source: 'cache'
      };
    }
    
    try {
      // Adicionar timeout específico para este request
      const response = await requestFn();
      
      // Verificar se a resposta já tem a estrutura correta
      const formattedResponse = response.success !== undefined 
        ? response 
        : { success: true, data: response };
      
      // Armazenar no cache
      this.cache[key] = {
        data: formattedResponse,
        timestamp: Date.now()
      };
      
      return {
        ...formattedResponse,
        source: 'api'
      };
    } catch (error) {
      console.warn(`Falha ao executar requisição ${key}:`, error);
      
      // Marcar esse endpoint como falho para evitar requisições repetidas
      this._markRequestAsFailed(key);
      
      // Se temos fallback, retornar como resposta de sucesso mas indicando uso de fallback
      if (fallbackData !== null) {
        return {
          success: true,
          data: fallbackData,
          source: 'fallback',
          error: error.toString()
        };
      }
      
      // Sem fallback, retornar erro
      return {
        success: false,
        error: error.toString(),
        source: 'error'
      };
    }
  }

  // Função helper para verificar se uma string é um ObjectId válido do MongoDB
  isValidObjectId(id) {
    return id && typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
  }

  // Função para obter o ID real de um setor pelo nome
  async getSetorIdByName(setorName) {
    if (!setorName) return null;
    
    try {
      // Usar cache local se disponível para evitar requisições repetidas
      if (!this.setoresCache) {
        const response = await this.getSetores();
        if (response.success && Array.isArray(response.data)) {
          this.setoresCache = response.data;
        } else {
          return null;
        }
      }
      
      // Procurar pelo setor com o nome correspondente
      const setor = this.setoresCache.find(
        s => s.nome && s.nome.toLowerCase() === setorName.toLowerCase()
      );
      
      return setor && setor._id ? setor._id : null;
    } catch (error) {
      console.error("Erro ao buscar ID do setor:", error);
      return null;
    }
  }

  // === MÉTODOS PARA SETORES === //

  /**
   * Lista todos os setores do usuário atual
   * @returns {Promise<Object>} Lista de setores
   */
  async getSetores() {
    const userId = this.getUserId();
    const response = await this._cachedRequest(
      'setores',
      () => this.api.get(`/users/${userId}/setores`),
      [{ 
        _id: 'financeiro-id', 
        userId, 
        nome: 'Financeiro', 
        descricao: 'Setor financeiro', 
        responsavel: 'Admin', 
        ativo: true 
      }]
    );
    
    // Atualizar o cache local dos setores
    if (response.success && Array.isArray(response.data)) {
      this.setoresCache = response.data;
    }
    
    return response;
  }

  /**
   * Obtém informações de um setor específico
   * @param {string} setorId - ID do setor
   * @returns {Promise<Object>} Dados do setor
   */
  async getSetorById(setorId) {
    const userId = this.getUserId();
    return this._cachedRequest(
      `setor-${setorId}`,
      () => this.api.get(`/users/${userId}/setores/${setorId}`),
      { 
        _id: setorId, 
        userId, 
        nome: 'Financeiro', 
        descricao: 'Setor financeiro', 
        responsavel: 'Admin', 
        ativo: true 
      }
    );
  }

  /**
   * Cria um novo setor
   * @param {Object} data - Dados do setor
   * @returns {Promise<Object>} Resposta da API
   */
  async createSetor(data) {
    const userId = this.getUserId();
    const response = await this.api.post(`/users/${userId}/setores`, data);
    
    // Invalidar cache de setores
    delete this.cache['setores'];
    this.setoresCache = null;
    
    return response;
  }

  /**
   * Atualiza um setor existente
   * @param {string} setorId - ID do setor
   * @param {Object} data - Dados a atualizar
   * @returns {Promise<Object>} Resposta da API
   */
  async updateSetor(setorId, data) {
    const userId = this.getUserId();
    const response = await this.api.put(`/users/${userId}/setores/${setorId}`, data);
    
    // Invalidar cache de setores
    delete this.cache['setores'];
    delete this.cache[`setor-${setorId}`];
    this.setoresCache = null;
    
    return response;
  }

  /**
   * Exclui um setor
   * @param {string} setorId - ID do setor
   * @returns {Promise<Object>} Resposta da API
   */
  async deleteSetor(setorId) {
    const userId = this.getUserId();
    const response = await this.api.delete(`/users/${userId}/setores/${setorId}`);
    
    // Invalidar cache de setores
    delete this.cache['setores'];
    delete this.cache[`setor-${setorId}`];
    this.setoresCache = null;
    
    return response;
  }

  // === MÉTODOS PARA CONVERSAS === //

  /**
   * Lista conversas com filtros opcionais
   * @param {Object} params - Parâmetros de filtro
   * @returns {Promise<Object>} Lista de conversas com paginação
   */
  async getConversas(params = {}) {
    const userId = this.getUserId();
    
    // Clonar os parâmetros para não modificar o objeto original
    let apiParams = { ...params };
    
    // Verificar se setorId é uma string que representa um nome de setor (não um ObjectId)
    if (apiParams.setorId && !this.isValidObjectId(apiParams.setorId)) {
      console.log(`Convertendo nome do setor '${apiParams.setorId}' para ObjectId`);
      
      // Buscar o ID real do setor pelo nome
      const setorId = await this.getSetorIdByName(apiParams.setorId);
      
      if (setorId) {
        apiParams.setorId = setorId;
        console.log(`Setor '${params.setorId}' convertido para ID: ${setorId}`);
      } else {
        console.warn(`Setor '${params.setorId}' não encontrado, removendo filtro`);
        delete apiParams.setorId;
      }
    }
    
    // Montar parâmetros finais
    const queryParams = {
      status: apiParams.status || undefined,
      setorId: apiParams.setorId || undefined,
      arquivada: apiParams.arquivada || undefined,
      page: apiParams.page || 1,
      limit: apiParams.limit || 20
    };
    
    return this._cachedRequest(
      `conversas-${JSON.stringify(queryParams)}`,
      () => this.api.get(`/users/${userId}/conversas`, { params: queryParams }),
      [] // Dados vazios como fallback
    );
  }

  /**
   * Obtém uma conversa pelo ID
   * @param {string} conversaId - ID da conversa
   * @returns {Promise<Object>} Dados da conversa
   */
  async getConversaById(conversaId) {
    const userId = this.getUserId();
    return this._cachedRequest(
      `conversa-${conversaId}`,
      () => this.api.get(`/users/${userId}/conversas/${conversaId}`),
      {
        _id: conversaId,
        userId,
        telefoneCliente: "+5521999887766",
        nomeCliente: "Cliente",
        setorId: {
          _id: "financeiro-id",
          nome: "Financeiro"
        },
        status: "aguardando",
        mensagens: [],
        arquivada: false,
        metadados: {},
        ultimaAtividade: new Date().toISOString(),
        created: new Date().toISOString()
      }
    );
  }

  /**
   * Obtém uma conversa pelo número de telefone
   * @param {string} telefone - Número de telefone
   * @returns {Promise<Object>} Dados da conversa
   */
  async getConversaByTelefone(telefone) {
    const userId = this.getUserId();
    return this._cachedRequest(
      `conversa-telefone-${telefone}`,
      () => this.api.get(`/users/${userId}/conversas/telefone/${telefone}`),
      null
    );
  }

  /**
   * Envia uma mensagem em uma conversa
   * @param {string} conversaId - ID da conversa
   * @param {string} conteudo - Texto da mensagem
   * @returns {Promise<Object>} Resposta da API
   */
  async enviarMensagem(conversaId, conteudo) {
    const userId = this.getUserId();
    return this.api.post(`/users/${userId}/conversas/${conversaId}/mensagens`, { conteudo });
  }

  /**
   * Transfere uma conversa para outro setor
   * @param {string} conversaId - ID da conversa
   * @param {string} setorId - ID do setor de destino
   * @returns {Promise<Object>} Resposta da API
   */
  async transferirConversa(conversaId, setorId) {
    const userId = this.getUserId();
    
    // Verificar se o setorId é um nome de setor e não um ID
    if (setorId && !this.isValidObjectId(setorId)) {
      const realSetorId = await this.getSetorIdByName(setorId);
      if (realSetorId) {
        setorId = realSetorId;
      } else {
        throw new Error(`Setor '${setorId}' não encontrado`);
      }
    }
    
    return this.api.put(`/users/${userId}/conversas/${conversaId}/transferir`, { setorId });
  }

  /**
   * Atualiza o status de uma conversa
   * @param {string} conversaId - ID da conversa
   * @param {string} status - Novo status
   * @returns {Promise<Object>} Resposta da API
   */
  async atualizarStatusConversa(conversaId, status) {
    const userId = this.getUserId();
    return this.api.put(`/users/${userId}/conversas/${conversaId}/status`, { status });
  }

  /**
   * Finaliza uma conversa
   * @param {string} conversaId - ID da conversa
   * @returns {Promise<Object>} Resposta da API
   */
  async finalizarConversa(conversaId) {
    const userId = this.getUserId();
    return this.api.put(`/users/${userId}/conversas/${conversaId}/finalizar`, {});
  }

  /**
   * Arquiva uma conversa
   * @param {string} conversaId - ID da conversa
   * @returns {Promise<Object>} Resposta da API
   */
  async arquivarConversa(conversaId) {
    const userId = this.getUserId();
    return this.api.put(`/users/${userId}/conversas/${conversaId}/arquivo`, {});
  }

  /**
   * Desarquiva uma conversa
   * @param {string} conversaId - ID da conversa
   * @returns {Promise<Object>} Resposta da API
   */
  async desarquivarConversa(conversaId) {
    const userId = this.getUserId();
    return this.api.put(`/users/${userId}/conversas/${conversaId}/desarquivar`, {});
  }

  // === MÉTODOS DE COMPATIBILIDADE === //
  
  /**
   * Método para retrocompatibilidade - APIs de dashboard removidas temporariamente
   */
  async getDashboard() {
    return {
      success: true,
      data: {
        totalConversas: 0,
        conversasResolvidas: 0,
        taxaResolucao: 0,
        tempoMedioResposta: 0,
        conversasPorStatus: {},
        volumeMensagensPorDia: []
      }
    };
  }

  /**
   * Método para retrocompatibilidade - mapeamento para getConversas
   */
  async getConversations(params = {}) {
    const result = await this.getConversas({
      status: params.status,
      setorId: params.setorId,
      arquivada: params.arquivada === true ? true : undefined,
      page: params.page,
      limit: params.limit
    });
    
    // Retornar apenas os dados (manter compatibilidade)
    return result.data;
  }

  /**
   * Método para retrocompatibilidade - mapeamento para getConversaById
   */
  async getConversationById(id) {
    const result = await this.getConversaById(id);
    return result.data;
  }

  /**
   * Método para retrocompatibilidade - mapeamento para enviarMensagem
   */
  async addMessage(conversationId, text) {
    const result = await this.enviarMensagem(conversationId, text);
    return result;
  }

  /**
   * Método para retrocompatibilidade - mapeamento para getSetores
   */
  async getSectors() {
    const result = await this.getSetores();
    return result.data;
  }
}

export default new ApiService();