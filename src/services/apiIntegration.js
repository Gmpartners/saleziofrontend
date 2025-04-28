import axios from 'axios';
import io from 'socket.io-client';

// Configurações da API baseadas no ambiente
const API_URL = import.meta.env.VITE_API_URL || 'https://multi.compracomsegurancaeconfianca.com/api';
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://multi.compracomsegurancaeconfianca.com';
const API_TOKEN = import.meta.env.VITE_API_TOKEN || 'netwydZWjrJpA';

/**
 * Cliente API configurado para integração com MultiFlow
 */
class ApiClient {
  constructor() {
    this.api = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
        'x-api-token': API_TOKEN
      },
      timeout: 15000
    });

    // Cache para evitar requisições desnecessárias
    this.cache = {};
    this.cacheDuration = 5 * 60 * 1000; // 5 minutos
  }

  /**
   * Configura token de autenticação no cabeçalho
   * @param {string} token Token JWT ou API
   * @param {boolean} isJwt Indica se é um token JWT
   */
  setAuthToken(token, isJwt = true) {
    if (isJwt) {
      this.api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      this.api.defaults.headers.common['x-api-token'] = token;
    }
  }

  /**
   * Obtém o ID do usuário atual
   * @returns {string} ID do usuário
   */
  getUserId() {
    // Obter do localStorage ou do contexto de autenticação
    return localStorage.getItem('userId') || '';
  }

  /**
   * Limpa o cache de requisições
   */
  clearCache() {
    this.cache = {};
    console.log('Cache de API limpo');
  }

  /**
   * Efetua uma requisição com cache
   * @param {Function} apiCall Função que faz a chamada à API
   * @param {string} cacheKey Chave para armazenar no cache
   * @param {boolean} forceRefresh Forçar atualização ignorando cache
   * @returns {Promise<any>} Resposta da API
   */
  async cachedRequest(apiCall, cacheKey, forceRefresh = false) {
    // Verificar se há dados em cache e se ainda são válidos
    if (!forceRefresh && 
        this.cache[cacheKey] && 
        Date.now() - this.cache[cacheKey].timestamp < this.cacheDuration) {
      console.log(`Usando dados em cache para: ${cacheKey}`);
      return this.cache[cacheKey].data;
    }

    try {
      // Fazer a requisição
      const response = await apiCall();
      
      // Armazenar em cache
      this.cache[cacheKey] = {
        data: response.data,
        timestamp: Date.now()
      };
      
      return response.data;
    } catch (error) {
      console.error(`Erro na requisição API (${cacheKey}):`, error);
      
      // Se houver dados em cache, retornar como fallback mesmo expirados
      if (this.cache[cacheKey]) {
        console.log(`Usando cache expirado como fallback para: ${cacheKey}`);
        return {
          ...this.cache[cacheKey].data,
          stale: true,
          error: error.message
        };
      }
      
      throw error;
    }
  }

  /**
   * Lista todos os setores do usuário
   * @param {string} userId ID do usuário
   * @param {boolean} forceRefresh Forçar atualização ignorando cache
   * @returns {Promise<any>} Lista de setores
   */
  async getSetores(userId = this.getUserId(), forceRefresh = false) {
    return this.cachedRequest(
      () => this.api.get(`/users/${userId}/setores`),
      `setores-${userId}`,
      forceRefresh
    );
  }

  /**
   * Obtém um setor específico pelo ID
   * @param {string} setorId ID do setor
   * @param {string} userId ID do usuário
   * @returns {Promise<any>} Dados do setor
   */
  async getSetorById(setorId, userId = this.getUserId()) {
    return this.cachedRequest(
      () => this.api.get(`/users/${userId}/setores/${setorId}`),
      `setor-${userId}-${setorId}`
    );
  }

  /**
   * Cria um novo setor
   * @param {Object} setorData Dados do setor
   * @param {string} userId ID do usuário
   * @returns {Promise<any>} Setor criado
   */
  async createSetor(setorData, userId = this.getUserId()) {
    try {
      const response = await this.api.post(`/users/${userId}/setores`, setorData);
      // Invalidar cache de setores
      delete this.cache[`setores-${userId}`];
      return response.data;
    } catch (error) {
      console.error('Erro ao criar setor:', error);
      throw error;
    }
  }

  /**
   * Atualiza um setor existente
   * @param {string} setorId ID do setor
   * @param {Object} setorData Dados do setor
   * @param {string} userId ID do usuário
   * @returns {Promise<any>} Setor atualizado
   */
  async updateSetor(setorId, setorData, userId = this.getUserId()) {
    try {
      const response = await this.api.put(`/users/${userId}/setores/${setorId}`, setorData);
      // Invalidar caches relacionados
      delete this.cache[`setores-${userId}`];
      delete this.cache[`setor-${userId}-${setorId}`];
      return response.data;
    } catch (error) {
      console.error(`Erro ao atualizar setor ${setorId}:`, error);
      throw error;
    }
  }

  /**
   * Lista conversas com filtros opcionais
   * @param {Object} filters Filtros (status, setorId, etc.)
   * @param {string} userId ID do usuário
   * @param {boolean} forceRefresh Forçar atualização ignorando cache
   * @returns {Promise<any>} Lista de conversas
   */
  async getConversas(filters = {}, userId = this.getUserId(), forceRefresh = false) {
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
    
    // Chave de cache baseada nos filtros
    const filterStr = JSON.stringify(params);
    const cacheKey = `conversas-${userId}-${filterStr}`;
    
    return this.cachedRequest(
      () => this.api.get(`/users/${userId}/conversas`, { params }),
      cacheKey,
      forceRefresh
    );
  }

  /**
   * Obtém uma conversa específica
   * @param {string} conversaId ID da conversa
   * @param {string} userId ID do usuário
   * @returns {Promise<any>} Dados da conversa
   */
  async getConversa(conversaId, userId = this.getUserId()) {
    return this.cachedRequest(
      () => this.api.get(`/users/${userId}/conversas/${conversaId}`),
      `conversa-${userId}-${conversaId}`
    );
  }

  /**
   * Envia uma mensagem em uma conversa
   * @param {string} conversaId ID da conversa
   * @param {string} conteudo Texto da mensagem
   * @param {string} userId ID do usuário
   * @returns {Promise<any>} Resposta da API
   */
  async enviarMensagem(conversaId, conteudo, userId = this.getUserId()) {
    try {
      const response = await this.api.post(
        `/users/${userId}/conversas/${conversaId}/mensagens`,
        { conteudo }
      );
      
      // Invalidar cache da conversa
      delete this.cache[`conversa-${userId}-${conversaId}`];
      
      return response.data;
    } catch (error) {
      console.error(`Erro ao enviar mensagem para conversa ${conversaId}:`, error);
      throw error;
    }
  }

  /**
   * Transfere uma conversa para outro setor
   * @param {string} conversaId ID da conversa
   * @param {string} setorId ID do setor de destino
   * @param {string} userId ID do usuário
   * @returns {Promise<any>} Resposta da API
   */
  async transferirConversa(conversaId, setorId, userId = this.getUserId()) {
    try {
      const response = await this.api.put(
        `/users/${userId}/conversas/${conversaId}/transferir`,
        { setorId }
      );
      
      // Invalidar caches relacionados
      delete this.cache[`conversa-${userId}-${conversaId}`];
      
      return response.data;
    } catch (error) {
      console.error(`Erro ao transferir conversa ${conversaId}:`, error);
      throw error;
    }
  }

  /**
   * Finaliza uma conversa
   * @param {string} conversaId ID da conversa
   * @param {string} userId ID do usuário
   * @returns {Promise<any>} Resposta da API
   */
  async finalizarConversa(conversaId, userId = this.getUserId()) {
    try {
      const response = await this.api.put(
        `/users/${userId}/conversas/${conversaId}/finalizar`
      );
      
      // Invalidar caches relacionados
      delete this.cache[`conversa-${userId}-${conversaId}`];
      
      return response.data;
    } catch (error) {
      console.error(`Erro ao finalizar conversa ${conversaId}:`, error);
      throw error;
    }
  }

  /**
   * Arquiva uma conversa
   * @param {string} conversaId ID da conversa
   * @param {string} userId ID do usuário
   * @returns {Promise<any>} Resposta da API
   */
  async arquivarConversa(conversaId, userId = this.getUserId()) {
    try {
      const response = await this.api.put(
        `/users/${userId}/conversas/${conversaId}/arquivo`
      );
      
      // Invalidar caches relacionados
      delete this.cache[`conversa-${userId}-${conversaId}`];
      
      return response.data;
    } catch (error) {
      console.error(`Erro ao arquivar conversa ${conversaId}:`, error);
      throw error;
    }
  }

  /**
   * Marca mensagens como lidas
   * @param {string} conversaId ID da conversa
   * @param {string} messageId ID da mensagem (opcional)
   * @param {string} userId ID do usuário
   * @returns {Promise<any>} Resposta da API
   */
  async markMessagesAsRead(conversaId, messageId = null, userId = this.getUserId()) {
    try {
      let endpoint = `/users/${userId}/conversas/${conversaId}/read`;
      
      // Se tiver ID de mensagem específica
      if (messageId) {
        endpoint = `/users/${userId}/conversas/${conversaId}/mensagens/${messageId}/read`;
      }
      
      const response = await this.api.post(endpoint);
      return response.data;
    } catch (error) {
      console.error(`Erro ao marcar mensagens como lidas na conversa ${conversaId}:`, error);
      throw error;
    }
  }

  /**
   * Verifica o status de saúde da API
   * @returns {Promise<boolean>} Status de saúde
   */
  async checkHealth() {
    try {
      const response = await this.api.get('/', { timeout: 5000 });
      return response.status < 300;
    } catch (error) {
      console.error('Erro ao verificar saúde da API:', error.message);
      return false;
    }
  }
}

/**
 * Cliente WebSocket para comunicação em tempo real
 */
class SocketClient {
  constructor() {
    this.socket = null;
    this.connected = false;
    this.eventListeners = {};
    this.rooms = new Set();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.userId = null;
    this.role = null;
  }

  /**
   * Inicializa a conexão WebSocket
   * @param {string} url URL do servidor WebSocket
   * @param {string} token Token de autenticação
   * @param {string} userId ID do usuário
   * @param {string} role Papel do usuário (agent/admin)
   */
  connect(url = SOCKET_URL, token = API_TOKEN, userId, role = 'agent') {
    // Armazenar dados do usuário
    this.userId = userId;
    this.role = role;

    // Verificar se já está conectado
    if (this.socket && this.connected) {
      console.log('WebSocket já está conectado');
      return;
    }

    // Configurar conexão
    this.socket = io(url, {
      auth: {
        token,
        userId,
        role
      },
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      transports: ['websocket', 'polling']
    });

    // Configurar eventos padrão
    this._setupDefaultListeners();

    console.log(`Conectando ao WebSocket ${url} com userId ${userId}`);
  }

  /**
   * Configura listeners padrão para o socket
   */
  _setupDefaultListeners() {
    if (!this.socket) return;

    // Evento de conexão
    this.socket.on('connect', () => {
      console.log('WebSocket conectado com sucesso');
      this.connected = true;
      this.reconnectAttempts = 0;
      this._notifyListeners('connect');
      this._rejoinRooms();
    });

    // Evento de desconexão
    this.socket.on('disconnect', (reason) => {
      console.log(`WebSocket desconectado: ${reason}`);
      this.connected = false;
      this._notifyListeners('disconnect', reason);
    });

    // Eventos de reconexão
    this.socket.io.on('reconnect', (attempt) => {
      console.log(`WebSocket reconectado na tentativa ${attempt}`);
      this.connected = true;
      this._notifyListeners('reconnect', attempt);
      this._rejoinRooms();
    });

    this.socket.io.on('reconnect_error', (error) => {
      console.log('Erro na tentativa de reconexão:', error);
      this._notifyListeners('reconnect_error', error);
    });

    this.socket.io.on('reconnect_failed', () => {
      console.log('Falha na reconexão após múltiplas tentativas');
      this._notifyListeners('reconnect_failed');
    });

    // Eventos específicos da aplicação
    const appEvents = [
      'nova_mensagem', 
      'nova_conversa', 
      'conversa_atualizada',
      'typing',
      'message_read'
    ];

    appEvents.forEach(eventName => {
      this.socket.on(eventName, (data) => {
        console.log(`Evento recebido: ${eventName}`, data);
        this._notifyListeners(eventName, data);
      });
    });

    // Evento de erro
    this.socket.on('error', (error) => {
      console.error('Erro no WebSocket:', error);
      this._notifyListeners('error', error);
    });
  }

  /**
   * Notifica listeners de um evento
   * @param {string} event Nome do evento
   * @param {any} data Dados do evento
   */
  _notifyListeners(event, data) {
    const listeners = this.eventListeners[event] || [];
    listeners.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Erro ao processar evento ${event}:`, error);
      }
    });
  }

  /**
   * Rejunta-se a todas as salas salvas
   */
  _rejoinRooms() {
    if (!this.socket || !this.connected) return;

    console.log(`Reconectando a ${this.rooms.size} salas`);
    this.rooms.forEach(room => {
      this.socket.emit('join', room);
      console.log(`Reconectado à sala: ${room}`);
    });
  }

  /**
   * Adiciona um listener para um evento
   * @param {string} event Nome do evento
   * @param {Function} callback Função de callback
   * @returns {Function} Função para remover o listener
   */
  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }

    this.eventListeners[event].push(callback);

    return () => {
      this.eventListeners[event] = (this.eventListeners[event] || [])
        .filter(cb => cb !== callback);
    };
  }

  /**
   * Entra em uma sala
   * @param {string} room Nome da sala
   */
  joinRoom(room) {
    if (!this.socket || !this.connected) {
      console.log(`Não é possível entrar na sala ${room}, socket não conectado`);
      return;
    }

    if (this.rooms.has(room)) {
      console.log(`Já está na sala: ${room}`);
      return;
    }

    console.log(`Entrando na sala: ${room}`);
    this.socket.emit('join', room);
    this.rooms.add(room);
  }

  /**
   * Sai de uma sala
   * @param {string} room Nome da sala
   */
  leaveRoom(room) {
    if (!this.socket || !this.connected) return;

    console.log(`Saindo da sala: ${room}`);
    this.socket.emit('leave', room);
    this.rooms.delete(room);
  }

  /**
   * Envia um indicador de digitação
   * @param {string} conversaId ID da conversa
   */
  sendTypingIndicator(conversaId) {
    if (!this.socket || !this.connected || !conversaId || !this.userId) return;

    this.socket.emit('typing', {
      conversaId,
      userId: this.userId
    });
  }

  /**
   * Verifica se o socket está conectado
   * @returns {boolean} Estado de conexão
   */
  isConnected() {
    return this.connected;
  }

  /**
   * Desconecta o socket
   */
  disconnect() {
    if (!this.socket) return;

    console.log('Desconectando WebSocket');
    this.socket.disconnect();
    this.connected = false;
    this.socket = null;
    this.rooms.clear();
    this.eventListeners = {};
  }

  /**
   * Simula o recebimento de uma nova mensagem (para testes)
   * @param {string} conversaId ID da conversa
   * @param {string} text Texto da mensagem
   * @returns {object} Mensagem simulada
   */
  simulateNewMessage(conversaId, text = "Mensagem simulada de teste") {
    const mockData = {
      conversaId,
      mensagem: {
        _id: `mock-${Date.now()}`,
        conteudo: text,
        remetente: 'cliente',
        timestamp: new Date().toISOString(),
        status: 'sent'
      }
    };

    console.log('SIMULANDO NOVA MENSAGEM:', mockData);
    this._notifyListeners('nova_mensagem', mockData);
    return mockData;
  }
}

// Criar e exportar instâncias únicas
export const apiClient = new ApiClient();
export const socketClient = new SocketClient();