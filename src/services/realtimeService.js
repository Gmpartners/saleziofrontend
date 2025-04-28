/**
 * Serviço aprimorado para comunicação em tempo real
 * Otimizado para desempenho e confiabilidade
 */
import { io } from 'socket.io-client';

class RealtimeService {
  constructor() {
    this.socket = null;
    this.channels = new Map();
    this.userId = null;
    this.role = null;
    this.sectorId = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.eventListeners = new Map();
    this.presenceData = new Map();
    this.typingIndicators = new Map();
    this.pendingMessages = [];
    this.lastHeartbeat = Date.now();
    this.heartbeatInterval = null;
    this.connectionState = 'DISCONNECTED';
    this.debug = true;
  }

  /**
   * Logger condicional para debug
   */
  log(...args) {
    if (this.debug) {
      console.log('[RealtimeService]', ...args);
    }
  }

  /**
   * Configura o socket para o usuário
   * @param {string} url - URL do servidor
   * @param {string} userId - ID do usuário
   * @param {string} role - Papel do usuário
   * @param {object} sector - Setor do usuário
   */
  setupForUser(url, userId, role, sector) {
    // Verificar se já está configurado para o mesmo usuário e setor
    const sectorId = sector ? (sector._id || sector.id || sector) : null;
    if (
      this.socket && 
      this.userId === userId && 
      this.role === role && 
      this.sectorId === sectorId &&
      this.socket.connected
    ) {
      this.log('Socket já configurado e conectado para este usuário');
      return;
    }

    // Desconectar qualquer socket existente
    if (this.socket) {
      this.log('Desconectando socket existente antes de criar novo');
      this.disconnect();
    }

    this.log(`Conectando ao WebSocket: ${url} com ID: ${userId}`);
    this.userId = userId;
    this.role = role;
    this.sectorId = sectorId;
    this.connectionState = 'CONNECTING';

    // Criar socket com opções aprimoradas
    this.socket = io(url, {
      auth: {
        token: 'netwydZWjrJpA', // Token de API fixo
        userId: userId,
        role: role
      },
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      transports: ['websocket', 'polling'],
      // Adicionar opções para melhorar eficiência da conexão
      upgrade: true,
      forceNew: false,
      multiplex: true
    });

    // Entrar em salas padrão
    this._joinDefaultRooms();

    // Configurar heartbeat para detecção rápida de desconexões
    this._setupHeartbeat();

    // Configurar listeners padrão
    this._setupDefaultListeners();

    // Salvar estado conectado
    this.connected = this.socket.connected;
    if (this.connected) {
      this.connectionState = 'CONNECTED';
    }
  }

  /**
   * Configura monitoramento de heartbeat para detectar desconexões silenciosas
   */
  _setupHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.connected) {
        this._sendHeartbeat();
      }
    }, 30000); // 30 segundos
  }

  /**
   * Envia um heartbeat para o servidor
   */
  _sendHeartbeat() {
    if (!this.socket || !this.connected) return;

    this.socket.emit('heartbeat', { timestamp: Date.now() });
    this.lastHeartbeat = Date.now();

    // Configurar timeout para verificar se o heartbeat foi respondido
    setTimeout(() => {
      const now = Date.now();
      // Se não recebemos um heartbeat em 45 segundos, consideramos desconectado
      if (now - this.lastHeartbeat > 45000) {
        this.log('Heartbeat timeout - considerando desconectado');
        this._handleDisconnection('heartbeat-timeout');
      }
    }, 45000);
  }

  /**
   * Lida com desconexão detectada via heartbeat
   */
  _handleDisconnection(reason) {
    if (this.connectionState === 'DISCONNECTED') return;

    this.log(`Desconexão detectada: ${reason}`);
    this.connected = false;
    this.connectionState = 'DISCONNECTED';

    // Notificar listeners
    this._notifyListeners('disconnect', reason);

    // Tentar reconectar
    this._attemptReconnection();
  }

  /**
   * Tenta reconexão com backoff exponencial
   */
  _attemptReconnection() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.log('Máximo de tentativas de reconexão atingido');
      this._notifyListeners('reconnect_failed');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * (Math.pow(1.5, this.reconnectAttempts)), 60000);
    
    this.log(`Tentando reconexão em ${delay}ms (tentativa ${this.reconnectAttempts})`);
    this.connectionState = 'RECONNECTING';
    
    setTimeout(() => {
      if (this.socket) {
        this.log('Tentando reconectar...');
        this.socket.connect();
      }
    }, delay);
  }

  /**
   * Configura listeners padrão para o socket
   */
  _setupDefaultListeners() {
    if (!this.socket) return;

    // Eventos de conexão
    this.socket.io.on('reconnect', (attempt) => {
      this.log(`Socket reconectado na tentativa ${attempt}`);
      this.connected = true;
      this.connectionState = 'CONNECTED';
      this.reconnectAttempts = 0;
      this._rejoinRooms();
      this._notifyListeners('reconnect', attempt);
    });

    this.socket.io.on('reconnect_attempt', (attempt) => {
      this.log(`Tentativa de reconexão ${attempt}`);
      this._notifyListeners('reconnect_attempt', attempt);
    });

    this.socket.io.on('reconnect_error', (error) => {
      this.log('Erro na reconexão:', error);
      this._notifyListeners('reconnect_error', error);
    });

    this.socket.io.on('reconnect_failed', () => {
      this.log('Falha na reconexão após múltiplas tentativas');
      this.connectionState = 'FAILED';
      this._notifyListeners('reconnect_failed');
    });

    // Evento de heartbeat
    this.socket.on('heartbeat_ack', (data) => {
      this.lastHeartbeat = Date.now();
    });

    // Erro no socket
    this.socket.io.on('error', (error) => {
      this.log('Erro no socket:', error);
      this._notifyListeners('error', error);
    });

    // Conexão e desconexão
    this.socket.on('connect', () => {
      this.log('Socket conectado');
      this.connected = true;
      this.connectionState = 'CONNECTED';
      this.reconnectAttempts = 0;
      this._notifyListeners('connect');
    });

    this.socket.on('disconnect', (reason) => {
      this.log('Socket desconectado:', reason);
      this.connected = false;
      this.connectionState = 'DISCONNECTED';
      this._notifyListeners('disconnect', reason);

      // Forçar reconexão se não for desconexão intencional
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        // Desconexão intencional, não reconectar
      } else {
        this._attemptReconnection();
      }
    });

    // Presença de usuários
    this.socket.on('user_presence', (data) => {
      this.log('Presença atualizada:', data);
      this.presenceData.set(data.userId, {
        online: data.status === 'online',
        lastSeen: data.timestamp,
        info: data.info
      });
      this._notifyListeners('presence_updated', data);
    });

    // Digitação
    this.socket.on('typing', (data) => {
      this.log('Indicador de digitação:', data);
      this.typingIndicators.set(data.conversaId, {
        userId: data.userId,
        userName: data.userName || 'Usuário',
        timestamp: Date.now()
      });
      
      // Limpar o indicador após alguns segundos
      setTimeout(() => {
        const indicator = this.typingIndicators.get(data.conversaId);
        if (indicator && indicator.userId === data.userId) {
          this.typingIndicators.delete(data.conversaId);
          this._notifyListeners('typing_stopped', data);
        }
      }, 5000);
      
      this._notifyListeners('typing', data);
    });

    // Nova mensagem dedicada com handling otimizado
    this.socket.on('nova_mensagem', (data) => {
      this.log('Nova mensagem recebida:', data);
      
      // Processar realmente apenas quando o socket está conectado
      if (this.connected) {
        this._notifyListeners('nova_mensagem', data);
      } else {
        // Em caso de desconexão, armazenar para processamento posterior
        this.pendingMessages.push({
          event: 'nova_mensagem',
          data,
          timestamp: Date.now()
        });
      }
    });
  }

  /**
   * Junta-se às salas padrão
   */
  _joinDefaultRooms() {
    if (!this.socket || !this.userId) return;

    // Sala de usuário
    const userRoom = `user_${this.userId}`;
    this.joinRoom(userRoom);

    // Sala de setor (se existir)
    if (this.sectorId) {
      const sectorRoom = `user_${this.userId}_setor_${this.sectorId}`;
      this.joinRoom(sectorRoom);
    }
  }

  /**
   * Rejunta-se a todas as salas salvas
   */
  _rejoinRooms() {
    if (!this.socket || !this.connected) return;

    const rooms = Array.from(this.channels.keys());
    if (rooms.length > 0) {
      this.log(`Reconectando a ${rooms.length} salas:`, rooms);
      
      rooms.forEach(room => {
        this.socket.emit('join', room);
        this.log(`Reconectado à sala: ${room}`);
      });

      // Processar mensagens que possam ter chegado durante a desconexão
      this._processPendingMessages();
    }
  }

  /**
   * Processa mensagens pendentes após reconexão
   */
  _processPendingMessages() {
    if (this.pendingMessages.length === 0) return;
    
    this.log(`Processando ${this.pendingMessages.length} mensagens pendentes`);
    
    // Ordenar por timestamp para garantir ordem correta
    this.pendingMessages.sort((a, b) => a.timestamp - b.timestamp);
    
    // Processar cada mensagem
    this.pendingMessages.forEach(item => {
      this._notifyListeners(item.event, item.data);
    });
    
    // Limpar mensagens pendentes
    this.pendingMessages = [];
  }

  /**
   * Envia evento aos listeners registrados
   */
  _notifyListeners(event, ...args) {
    if (!this.eventListeners.has(event)) return;
    
    const listeners = this.eventListeners.get(event);
    const now = Date.now();
    
    // Lista de eventos críticos que não devem sofrer throttling
    const criticalEvents = ['nova_mensagem', 'nova_conversa', 'connect', 'disconnect'];
    
    // Processamento imediato para eventos críticos
    if (criticalEvents.includes(event)) {
      listeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Erro ao processar evento crítico ${event}:`, error);
        }
      });
      return;
    }
    
    // Aplicar throttling para eventos não críticos
    const minInterval = 100; // ms
    const lastTimestamp = this.eventListeners.get(`${event}_timestamp`) || 0;
    
    if (now - lastTimestamp < minInterval) {
      // Ignorar eventos muito frequentes
      return;
    }
    
    this.eventListeners.set(`${event}_timestamp`, now);
    
    // Usar timeout para dar prioridade a eventos críticos
    setTimeout(() => {
      listeners.forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Erro ao processar evento ${event}:`, error);
        }
      });
    }, 0);
  }

  /**
   * Entra em uma sala
   * @param {string} room - Identificador da sala
   */
  joinRoom(room) {
    if (!this.socket) {
      this.log(`Não é possível entrar na sala ${room}, socket não inicializado`);
      return;
    }

    if (this.channels.has(room)) {
      this.log(`Já está na sala: ${room}`);
      return;
    }

    this.log(`Entrando na sala: ${room}`);
    this.socket.emit('join', room);
    this.channels.set(room, {
      active: true,
      joinedAt: Date.now()
    });
  }

  /**
   * Sai de uma sala
   * @param {string} room - Identificador da sala
   */
  leaveRoom(room) {
    if (!this.socket) return;

    this.log(`Saindo da sala: ${room}`);
    this.socket.emit('leave', room);
    this.channels.delete(room);
  }

  /**
   * Adiciona listener para um evento
   * @param {string} event - Nome do evento
   * @param {function} callback - Função a ser chamada quando o evento ocorrer
   * @returns {function} Função para remover o listener
   */
  on(event, callback) {
    if (!this.socket) {
      this.log(`Não é possível adicionar listener para evento ${event}, socket não inicializado`);
      return () => {};
    }

    this.log(`Adicionando listener para evento: ${event}`);
    
    // Inicializar array de listeners para o evento
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
      
      // Registrar no socket apenas se não for um evento interno
      if (!event.startsWith('_')) {
        this.socket.on(event, (...args) => {
          this._notifyListeners(event, ...args);
        });
      }
    }
    
    // Adicionar o callback à lista de listeners
    const listeners = this.eventListeners.get(event);
    listeners.push(callback);
    this.eventListeners.set(event, listeners);
    
    // Retornar função para remover listener
    return () => {
      if (!this.eventListeners.has(event)) return;
      
      const updatedListeners = this.eventListeners.get(event).filter(cb => cb !== callback);
      
      if (updatedListeners.length === 0) {
        // Se não tiver mais listeners, remover do socket e da lista
        if (this.socket && !event.startsWith('_')) {
          this.socket.off(event);
        }
        this.eventListeners.delete(event);
        this.eventListeners.delete(`${event}_timestamp`);
      } else {
        // Atualizar lista de listeners
        this.eventListeners.set(event, updatedListeners);
      }
    };
  }

  /**
   * Verifica se o socket está conectado
   * @returns {boolean}
   */
  isConnected() {
    return this.socket && this.socket.connected;
  }

  /**
   * Obtém o estado atual de conexão
   * @returns {string} Estado da conexão
   */
  getConnectionState() {
    return this.connectionState;
  }

  /**
   * Verifica se um usuário está digitando em uma conversa
   * @param {string} conversationId - ID da conversa
   * @returns {object|null} Dados de digitação ou null
   */
  getTypingIndicator(conversationId) {
    if (!conversationId) return null;
    
    const indicator = this.typingIndicators.get(conversationId);
    
    if (!indicator) return null;
    
    // Verificar se o indicador ainda é válido (menos de 5 segundos)
    const now = Date.now();
    if (now - indicator.timestamp > 5000) {
      this.typingIndicators.delete(conversationId);
      return null;
    }
    
    return indicator;
  }

  /**
   * Envia indicador de que o usuário está digitando
   * @param {string} conversationId - ID da conversa
   */
  sendTypingIndicator(conversationId) {
    if (!this.socket || !this.connected || !conversationId || !this.userId) return;
    
    this.socket.emit('typing', {
      conversaId: conversationId,
      userId: this.userId,
      userName: this.userId
    });
  }

  /**
   * Desconecta o socket
   */
  disconnect() {
    if (!this.socket) return;

    this.log('Desconectando socket');
    
    // Limpar heartbeat
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    // Limpar listeners para evitar vazamentos de memória
    if (this.socket.offAny) {
      this.socket.offAny();
    } else {
      // Limpar cada evento individualmente como fallback
      this.eventListeners.forEach((_, event) => {
        if (!event.endsWith('_timestamp') && !event.startsWith('_')) {
          this.socket.off(event);
        }
      });
    }
    
    // Limpar dados
    this.eventListeners.clear();
    this.typingIndicators.clear();
    this.presenceData.clear();
    
    // Desconectar socket
    this.socket.disconnect();
    this.connected = false;
    this.connectionState = 'DISCONNECTED';
    this.socket = null;
    this.channels.clear();
  }

  /**
   * Simula o recebimento de uma nova mensagem (para testes)
   * @param {string} conversationId - ID da conversa
   * @param {string} text - Texto da mensagem
   * @returns {object} Dados da mensagem simulada
   */
  simulateNewMessage(conversationId, text = "Mensagem simulada de teste") {
    const mockData = {
      conversaId: conversationId,
      mensagem: {
        _id: `mock-${Date.now()}`,
        conteudo: text,
        remetente: 'cliente',
        timestamp: new Date().toISOString(),
        status: 'sent'
      }
    };

    this.log('SIMULANDO NOVA MENSAGEM:', mockData);
    // Notificar através do sistema padronizado
    this._notifyListeners('nova_mensagem', mockData);
    return mockData;
  }
}

// Exportar instância única
export const realtimeService = new RealtimeService();