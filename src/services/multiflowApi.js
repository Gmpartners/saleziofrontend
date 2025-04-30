import axios from 'axios';
import { API_URL, API_TOKEN, AUTH_HEADER, API_ENDPOINTS } from '../config/syncConfig';

/**
 * Serviço otimizado para comunicação com a API MultiFlow
 */
class MultiflowApiService {
  constructor() {
    // Inicialização básica do axios
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000 // 15 segundos
    });
    
    // Adicionar interceptor para garantir que o token esteja sempre presente
    this.api.interceptors.request.use((config) => {
      // Tentar obter o token do localStorage primeiro (mais atualizado)
      const token = localStorage.getItem('apiToken') || API_TOKEN;
      
      if (token) {
        config.headers[AUTH_HEADER] = token;
      } else {
        console.warn('Token de API não encontrado!');
      }
      
      return config;
    });
    
    // Cache para armazenar respostas
    this.cache = {};
    this.cacheDuration = 5 * 60 * 1000; // 5 minutos em milissegundos
    this.setoresCache = null;
    this.allConversasCache = []; // Cache global para todas as conversas ativas
    this.completedConversasCache = []; // Cache para conversas concluídas
    this.conversationCache = new Map(); // Cache por ID de conversa
    this.lastConversasFetch = 0; // Timestamp da última busca de conversas
    this.lastCompletedConversasFetch = 0; // Timestamp da última busca de conversas concluídas
    this.isFetchingConversas = false; // Flag para evitar requisições duplicadas
    this.isFetchingCompletedConversas = false; // Flag para evitar requisições duplicadas
    this.pendingFetches = new Map(); // Controlar requisições em andamento por conversationId
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
   * Obtém uma conversa específica pelo ID com controle de cache e prevenção de requisições duplicadas
   */
  async getConversa(conversaId, userId = this.getUserId(), forceRefresh = false) {
    try {
      console.log(`Buscando detalhes da conversa ${conversaId} para o usuário: ${userId}`);
      
      // Verificar se já existe uma requisição em andamento para essa conversa
      if (this.pendingFetches.has(conversaId)) {
        console.log(`Já existe uma requisição em andamento para conversa ${conversaId}, aguardando...`);
        try {
          // Aguardar a requisição em andamento
          return await this.pendingFetches.get(conversaId);
        } catch (error) {
          // Se a requisição em andamento falhar, continuar com uma nova
          console.warn(`Requisição anterior para conversa ${conversaId} falhou, tentando novamente`);
        }
      }
      
      // Verificar cache
      const cachedConversation = this.conversationCache.get(conversaId);
      const now = Date.now();
      
      // Se tiver cache recente (menos de 10 segundos) e não forçar atualização, usar cache
      if (cachedConversation && 
          now - cachedConversation.timestamp < 10000 && 
          !forceRefresh) {
        console.log(`Usando cache recente para conversa ${conversaId}`);
        return {
          success: true,
          data: cachedConversation.data
        };
      }
      
      // Criar uma promessa para esta requisição
      const fetchPromise = new Promise(async (resolve, reject) => {
        try {
          // Buscar detalhes atualizados
          const response = await this.api.get(API_ENDPOINTS.getConversa(userId, conversaId));
          
          // Se for bem-sucedido, atualizar todos os caches
          if (response.data.success && response.data.data) {
            const data = response.data.data;
            
            // Atualizar cache específico da conversa
            this.conversationCache.set(conversaId, {
              data,
              timestamp: now
            });
            
            const isFinalized = data.status && data.status.toLowerCase() === 'finalizada';
            
            if (isFinalized) {
              // Atualizar no cache de conversas concluídas
              const conversationIndex = this.completedConversasCache.findIndex(conv => conv._id === conversaId);
              if (conversationIndex >= 0) {
                this.completedConversasCache[conversationIndex] = data;
              } else {
                this.completedConversasCache.push(data);
              }
            } else {
              // Atualizar no cache global de conversas ativas
              const conversationIndex = this.allConversasCache.findIndex(conv => conv._id === conversaId);
              if (conversationIndex >= 0) {
                this.allConversasCache[conversationIndex] = {
                  ...data,
                  unreadCount: 0, // Zerar contagem ao visualizar detalhes
                  lastMessageRead: true
                };
              } else {
                this.allConversasCache.push({
                  ...data,
                  unreadCount: 0,
                  lastMessageRead: true
                });
              }
            }
          }
          
          console.log(`Detalhes da conversa obtidos com sucesso: ${conversaId}`);
          resolve(response.data);
        } catch (error) {
          console.error(`Erro ao buscar detalhes da conversa ${conversaId}:`, error.message);
          
          // Tentar encontrar a conversa em algum cache
          const cachedConversation = this.conversationCache.get(conversaId) || 
                                    this.allConversasCache.find(conv => conv._id === conversaId) || 
                                    this.completedConversasCache.find(conv => conv._id === conversaId);
          
          if (cachedConversation) {
            console.log(`Usando conversa do cache como fallback para ${conversaId}`);
            resolve({
              success: true,
              error: error.message,
              data: cachedConversation.data || cachedConversation
            });
          } else {
            reject(error);
          }
        } finally {
          // Remover esta requisição das pendentes
          this.pendingFetches.delete(conversaId);
        }
      });
      
      // Registrar esta promessa como em andamento
      this.pendingFetches.set(conversaId, fetchPromise);
      
      return await fetchPromise;
    } catch (error) {
      console.error(`Erro ao buscar detalhes da conversa ${conversaId}:`, error.message);
      
      // Retornar erro
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Marca todas as mensagens de uma conversa como lidas
   */
  async markConversationAsRead(conversaId, userId = this.getUserId()) {
    try {
      console.log(`Marcando todas as mensagens da conversa ${conversaId} como lidas`);
      
      // Verificar se o endpoint está disponível
      if (!API_ENDPOINTS.markRead) {
        console.warn('Endpoint para marcar mensagens como lidas não configurado');
        // Tentar implementação alternativa - apenas atualizar o cache
        const conversationIndex = this.allConversasCache.findIndex(conv => conv._id === conversaId);
        if (conversationIndex >= 0) {
          this.allConversasCache[conversationIndex].unreadCount = 0;
          this.allConversasCache[conversationIndex].lastMessageRead = true;
        }
        
        // Atualizar também o cache específico
        if (this.conversationCache.has(conversaId)) {
          const cachedData = this.conversationCache.get(conversaId);
          cachedData.data.unreadCount = 0;
          cachedData.data.lastMessageRead = true;
          this.conversationCache.set(conversaId, {
            ...cachedData,
            timestamp: Date.now() // Atualizar timestamp
          });
        }
        
        return { success: true };
      }
      
      const response = await this.api.post(API_ENDPOINTS.markRead(userId, conversaId));
      
      // Atualizar todos os caches
      const conversationIndex = this.allConversasCache.findIndex(conv => conv._id === conversaId);
      if (conversationIndex >= 0) {
        this.allConversasCache[conversationIndex].unreadCount = 0;
        this.allConversasCache[conversationIndex].lastMessageRead = true;
      }
      
      if (this.conversationCache.has(conversaId)) {
        const cachedData = this.conversationCache.get(conversaId);
        cachedData.data.unreadCount = 0;
        cachedData.data.lastMessageRead = true;
        this.conversationCache.set(conversaId, {
          ...cachedData,
          timestamp: Date.now() // Atualizar timestamp
        });
      }
      
      console.log('Mensagens marcadas como lidas com sucesso');
      return response.data;
    } catch (error) {
      console.error(`Erro ao marcar mensagens como lidas na conversa ${conversaId}:`, error.message);
      
      // Mesmo com erro, atualizar o cache local para melhorar UX
      const conversationIndex = this.allConversasCache.findIndex(conv => conv._id === conversaId);
      if (conversationIndex >= 0) {
        this.allConversasCache[conversationIndex].unreadCount = 0;
        this.allConversasCache[conversationIndex].lastMessageRead = true;
      }
      
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Marca uma mensagem específica como lida
   */
  async markMessageAsRead(conversaId, messageId, userId = this.getUserId()) {
    try {
      console.log(`Marcando mensagem ${messageId} da conversa ${conversaId} como lida`);
      
      // Verificar se o endpoint está disponível
      if (!API_ENDPOINTS.markMessageRead) {
        console.warn('Endpoint para marcar mensagem como lida não configurado');
        return { success: true };
      }
      
      const response = await this.api.post(API_ENDPOINTS.markMessageRead(userId, conversaId, messageId));
      
      console.log('Mensagem marcada como lida com sucesso');
      return response.data;
    } catch (error) {
      console.error(`Erro ao marcar mensagem ${messageId} como lida:`, error.message);
      
      return {
        success: false,
        error: error.message
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
      
      // Atualizar todos os caches
      const conversationIndex = this.allConversasCache.findIndex(conv => conv._id === conversaId);
      if (conversationIndex >= 0 && response.data.success && response.data.data) {
        this.allConversasCache[conversationIndex] = {
          ...this.allConversasCache[conversationIndex],
          ...response.data.data,
          lastMessageRead: true
        };
      }
      
      // Atualizar cache específico se existir
      if (this.conversationCache.has(conversaId) && response.data.success && response.data.data) {
        const cachedData = this.conversationCache.get(conversaId);
        // Verificar se temos a mensagem recém-adicionada
        if (response.data.data.mensagens && cachedData.data.mensagens) {
          // Manter todas as mensagens do cache e adicionar/atualizar as novas
          const existingMessageIds = new Set(cachedData.data.mensagens.map(msg => msg._id));
          const newMessages = response.data.data.mensagens.filter(msg => !existingMessageIds.has(msg._id));
          
          this.conversationCache.set(conversaId, {
            data: {
              ...cachedData.data,
              ...response.data.data,
              mensagens: [...cachedData.data.mensagens, ...newMessages],
              lastMessageRead: true
            },
            timestamp: Date.now()
          });
        } else {
          // Se não temos mensagens no cache ou na resposta, apenas atualizar o que temos
          this.conversationCache.set(conversaId, {
            data: {
              ...cachedData.data,
              ...response.data.data,
              lastMessageRead: true
            },
            timestamp: Date.now()
          });
        }
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
      
      // Atualizar cache específico se existir
      if (this.conversationCache.has(conversaId)) {
        const cachedData = this.conversationCache.get(conversaId);
        cachedData.data.status = status;
        this.conversationCache.set(conversaId, {
          ...cachedData,
          timestamp: Date.now() // Atualizar timestamp
        });
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
      
      // Atualizar cache específico se existir
      if (this.conversationCache.has(conversaId)) {
        const cachedData = this.conversationCache.get(conversaId);
        cachedData.data.status = 'finalizada';
        this.conversationCache.set(conversaId, {
          ...cachedData,
          timestamp: Date.now() // Atualizar timestamp
        });
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
      this.conversationCache.delete(conversaId);
      
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
      
      // Atualizar todos os caches
      const conversationIndex = this.allConversasCache.findIndex(conv => conv._id === conversaId);
      if (conversationIndex >= 0 && response.data.success && response.data.data) {
        this.allConversasCache[conversationIndex] = {
          ...this.allConversasCache[conversationIndex],
          setorId: setorId
        };
      }
      
      // Atualizar cache específico se existir
      if (this.conversationCache.has(conversaId)) {
        const cachedData = this.conversationCache.get(conversaId);
        cachedData.data.setorId = setorId;
        this.conversationCache.set(conversaId, {
          ...cachedData,
          timestamp: Date.now() // Atualizar timestamp
        });
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
    this.conversationCache.clear();
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