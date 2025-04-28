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
      timeout: 15000 // 15 segundos
    });
    
    // Cache para armazenar respostas
    this.cache = {};
    this.cacheDuration = 5 * 60 * 1000; // 5 minutos em milissegundos
    this.setoresCache = null;
    this.allConversasCache = []; // Cache global para todas as conversas ativas
    this.completedConversasCache = []; // Cache para conversas concluídas
    this.lastConversasFetch = 0; // Timestamp da última busca de conversas
    this.lastCompletedConversasFetch = 0; // Timestamp da última busca de conversas concluídas
    this.isFetchingConversas = false; // Flag para evitar requisições duplicadas
    this.isFetchingCompletedConversas = false; // Flag para evitar requisições duplicadas
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
      if (this.cache[cacheKey] && Date.now() - this.cache[cacheKey].timestamp < this.cacheDuration) {
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
      if (this.cache[cacheKey] && Date.now() - this.cache[cacheKey].timestamp < this.cacheDuration) {
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
    // Verificar se são conversas finalizadas
    const isCompletedRequest = filters.status && 
        (Array.isArray(filters.status) ? 
            filters.status.includes('finalizada') : 
            filters.status === 'finalizada');
    
    // Se for uma requisição de conversas finalizadas, usar método específico
    if (isCompletedRequest) {
      return this.getCompletedConversas(filters, userId);
    }
    
    // Verificar se já existe uma requisição em andamento
    if (this.isFetchingConversas) {
      console.log('Já existe uma requisição de conversas em andamento, usando cache existente');
      return {
        success: true,
        data: this.allConversasCache
      };
    }
    
    // Verificar se o cache está recente (menos de 1 minuto)
    const now = Date.now();
    const cacheAge = now - this.lastConversasFetch;
    if (this.allConversasCache.length > 0 && cacheAge < 60000) {
      console.log(`Usando cache de conversas (${this.allConversasCache.length} conversas, idade: ${cacheAge}ms)`);
      return {
        success: true,
        data: this.allConversasCache
      };
    }
    
    this.isFetchingConversas = true;
    
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
      params.limit = filters.limit || 50; // 50 para mostrar mais conversas
      
      const response = await this.api.get(API_ENDPOINTS.getConversas(userId), { params });
      this.lastConversasFetch = now;
      
      // Se a requisição for bem-sucedida e tiver dados, atualizar o cache
      if (response.data.success && Array.isArray(response.data.data)) {
        // Se não estiver filtrando por setor, usar como cache global
        if (!filters.setorId) {
          this.allConversasCache = response.data.data.map(conv => ({
            ...conv,
            unreadCount: 0,
            lastMessageRead: true
          }));
        } else {
          // Se estiver filtrando por setor, adicionar ao cache global apenas se não existirem
          response.data.data.forEach(conv => {
            const existingIndex = this.allConversasCache.findIndex(c => c._id === conv._id);
            if (existingIndex >= 0) {
              this.allConversasCache[existingIndex] = {
                ...conv,
                unreadCount: this.allConversasCache[existingIndex].unreadCount || 0,
                lastMessageRead: this.allConversasCache[existingIndex].lastMessageRead !== undefined ? 
                  this.allConversasCache[existingIndex].lastMessageRead : true
              };
            } else {
              this.allConversasCache.push({
                ...conv,
                unreadCount: 0,
                lastMessageRead: true
              });
            }
          });
        }
        
        console.log(`Conversas obtidas com sucesso: ${response.data.data.length} conversas`);
      } else {
        console.warn('Resposta vazia ou inválida da API de conversas');
      }
      
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar conversas:', error.message);
      
      // Se tiver cache global e ocorrer erro, retornar o cache como fallback
      if (this.allConversasCache.length > 0) {
        console.log(`Usando cache global como fallback (${this.allConversasCache.length} conversas)`);
        return {
          success: true,
          error: error.message,
          data: this.allConversasCache
        };
      }
      
      return {
        success: false,
        error: error.message,
        data: []
      };
    } finally {
      // Atraso para evitar novas requisições imediatamente
      setTimeout(() => {
        this.isFetchingConversas = false;
      }, 1000);
    }
  }

  /**
   * Obtém lista de conversas concluídas
   */
  async getCompletedConversas(filters = {}, userId = this.getUserId()) {
    // Verificar se já existe uma requisição em andamento
    if (this.isFetchingCompletedConversas) {
      console.log('Já existe uma requisição de conversas concluídas em andamento, usando cache existente');
      return {
        success: true,
        data: this.completedConversasCache
      };
    }
    
    // Verificar se o cache está recente (menos de 5 minutos para conversas concluídas)
    const now = Date.now();
    const cacheAge = now - this.lastCompletedConversasFetch;
    if (this.completedConversasCache.length > 0 && cacheAge < 300000) {
      console.log(`Usando cache de conversas concluídas (${this.completedConversasCache.length} conversas, idade: ${cacheAge}ms)`);
      return {
        success: true,
        data: this.completedConversasCache
      };
    }
    
    this.isFetchingCompletedConversas = true;
    
    try {
      console.log(`Buscando conversas concluídas para o usuário: ${userId}`, filters);
      
      // Garantir que estamos buscando apenas conversas finalizadas
      const params = {
        status: 'finalizada',
        page: filters.page || 1,
        limit: filters.limit || 50,
      };
      
      if (filters.setorId) {
        params.setorId = filters.setorId;
      }
      
      if (filters.arquivada !== undefined) {
        params.arquivada = filters.arquivada;
      } else {
        params.arquivada = false; // Por padrão, buscar apenas não arquivadas
      }
      
      const response = await this.api.get(API_ENDPOINTS.getConversas(userId), { params });
      this.lastCompletedConversasFetch = now;
      
      // Se a requisição for bem-sucedida e tiver dados, atualizar o cache
      if (response.data.success && Array.isArray(response.data.data)) {
        this.completedConversasCache = response.data.data;
        console.log(`Conversas concluídas obtidas com sucesso: ${response.data.data.length} conversas`);
      } else {
        console.warn('Resposta vazia ou inválida da API de conversas concluídas');
      }
      
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar conversas concluídas:', error.message);
      
      // Se tiver cache e ocorrer erro, retornar o cache como fallback
      if (this.completedConversasCache.length > 0) {
        console.log(`Usando cache como fallback (${this.completedConversasCache.length} conversas concluídas)`);
        return {
          success: true,
          error: error.message,
          data: this.completedConversasCache
        };
      }
      
      return {
        success: false,
        error: error.message,
        data: []
      };
    } finally {
      // Atraso para evitar novas requisições imediatamente
      setTimeout(() => {
        this.isFetchingCompletedConversas = false;
      }, 1000);
    }
  }

  /**
   * Obtém uma conversa específica pelo ID
   */
  async getConversa(conversaId, userId = this.getUserId()) {
    try {
      console.log(`Buscando detalhes da conversa ${conversaId} para o usuário: ${userId}`);
      
      // Verificar se a conversa está no cache primeiro
      const cachedConversation = this.allConversasCache.find(conv => conv._id === conversaId) || 
                                 this.completedConversasCache.find(conv => conv._id === conversaId);
      
      // Se tiver mensagens no cache, usá-lo diretamente
      if (cachedConversation && cachedConversation.mensagens && cachedConversation.mensagens.length > 0) {
        console.log(`Usando detalhes em cache para conversa ${conversaId}`);
        return {
          success: true,
          data: cachedConversation
        };
      }
      
      // Buscar detalhes atualizados
      const response = await this.api.get(API_ENDPOINTS.getConversa(userId, conversaId));
      
      // Se for bem-sucedido, atualizar a conversa no cache apropriado
      if (response.data.success && response.data.data) {
        const isFinalized = response.data.data.status && 
                           response.data.data.status.toLowerCase() === 'finalizada';
        
        if (isFinalized) {
          // Atualizar no cache de conversas concluídas
          const conversationIndex = this.completedConversasCache.findIndex(conv => conv._id === conversaId);
          if (conversationIndex >= 0) {
            this.completedConversasCache[conversationIndex] = response.data.data;
          } else {
            this.completedConversasCache.push(response.data.data);
          }
        } else {
          // Atualizar no cache global de conversas ativas
          const conversationIndex = this.allConversasCache.findIndex(conv => conv._id === conversaId);
          if (conversationIndex >= 0) {
            this.allConversasCache[conversationIndex] = {
              ...response.data.data,
              unreadCount: 0, // Zerar contagem ao visualizar detalhes
              lastMessageRead: true
            };
          } else {
            this.allConversasCache.push({
              ...response.data.data,
              unreadCount: 0,
              lastMessageRead: true
            });
          }
        }
      }
      
      console.log(`Detalhes da conversa obtidos com sucesso: ${conversaId}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao buscar detalhes da conversa ${conversaId}:`, error.message);
      
      // Tentar encontrar a conversa no cache
      const cachedConversation = this.allConversasCache.find(conv => conv._id === conversaId) || 
                                this.completedConversasCache.find(conv => conv._id === conversaId);
      
      if (cachedConversation) {
        console.log(`Usando conversa do cache como fallback para ${conversaId}`);
        return {
          success: true,
          error: error.message,
          data: cachedConversation
        };
      }
      
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
      
      // Atualizar a conversa no cache global
      const conversationIndex = this.allConversasCache.findIndex(conv => conv._id === conversaId);
      if (conversationIndex >= 0 && response.data.success && response.data.data) {
        this.allConversasCache[conversationIndex] = {
          ...this.allConversasCache[conversationIndex],
          ...response.data.data,
          lastMessageRead: true
        };
      }
      
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
      
      // Se estiver finalizando a conversa, mover para o cache de conversas concluídas
      if (status.toLowerCase() === 'finalizada') {
        const conversationIndex = this.allConversasCache.findIndex(conv => conv._id === conversaId);
        if (conversationIndex >= 0) {
          const conversation = this.allConversasCache[conversationIndex];
          this.completedConversasCache.push({
            ...conversation,
            status: 'finalizada'
          });
          // Remover da lista de conversas ativas
          this.allConversasCache.splice(conversationIndex, 1);
        }
      } else {
        // Atualizar a conversa no cache global
        const conversationIndex = this.allConversasCache.findIndex(conv => conv._id === conversaId);
        if (conversationIndex >= 0) {
          this.allConversasCache[conversationIndex].status = status;
        }
      }
      
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
   * Finaliza uma conversa
   */
  async finalizarConversa(conversaId, userId = this.getUserId()) {
    try {
      console.log(`Finalizando conversa ${conversaId} para usuário ${userId}`);
      
      const response = await this.api.put(
        API_ENDPOINTS.finalizarConversa(userId, conversaId)
      );
      
      // Mover a conversa do cache global para o cache de concluídas
      const conversationIndex = this.allConversasCache.findIndex(conv => conv._id === conversaId);
      if (conversationIndex >= 0) {
        const conversation = this.allConversasCache[conversationIndex];
        // Adicionar ao cache de concluídas
        this.completedConversasCache.push({
          ...conversation,
          status: 'finalizada'
        });
        // Remover da lista de conversas ativas
        this.allConversasCache.splice(conversationIndex, 1);
      }
      
      console.log(`Conversa finalizada com sucesso: ${conversaId}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao finalizar conversa ${conversaId}:`, error.message);
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Arquiva uma conversa
   */
  async arquivarConversa(conversaId, userId = this.getUserId()) {
    try {
      console.log(`Arquivando conversa ${conversaId} para usuário ${userId}`);
      
      const response = await this.api.put(
        API_ENDPOINTS.arquivarConversa(userId, conversaId)
      );
      
      // Remover a conversa dos caches
      this.allConversasCache = this.allConversasCache.filter(conv => conv._id !== conversaId);
      this.completedConversasCache = this.completedConversasCache.filter(conv => conv._id !== conversaId);
      
      console.log(`Conversa arquivada com sucesso: ${conversaId}`);
      return response.data;
    } catch (error) {
      console.error(`Erro ao arquivar conversa ${conversaId}:`, error.message);
      
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
      
      // Atualizar a conversa no cache global
      const conversationIndex = this.allConversasCache.findIndex(conv => conv._id === conversaId);
      if (conversationIndex >= 0 && response.data.success && response.data.data) {
        this.allConversasCache[conversationIndex] = {
          ...this.allConversasCache[conversationIndex],
          setorId: setorId
        };
      }
      
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
   * Limpa o cache e força a atualização dos dados
   */
  resetCache() {
    console.log('Limpando todo o cache da API');
    this.cache = {};
    this.setoresCache = null;
    this.allConversasCache = [];
    this.completedConversasCache = [];
    this.lastConversasFetch = 0;
    this.lastCompletedConversasFetch = 0;
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