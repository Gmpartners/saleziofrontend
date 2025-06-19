import { io } from 'socket.io-client';

class SocketService {
  constructor() {
    this.socket = null;
    this.authenticated = false;
    this.userId = null;
    this.userProfile = null;
    this.queuedMessages = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 2000;
    this.pendingEvents = [];
    this.activeSubscriptions = new Set();
    this.adminSubscribed = false;
    this.serverUrl = import.meta.env.VITE_SOCKET_URL || '';
    this.observers = {};
    this.isConnecting = false;
    this.requestQueue = [];
    this.socketId = null;
    this.lastPingTime = 0;
    this.pingInterval = null;
    this.connectionTimeout = null;
    this.connectionTimeoutDuration = 30000;
    this.networkOnline = navigator.onLine;
    this.reconnectTimer = null;
    this.connectionState = 'disconnected';
  }

  initialize(serverUrl) {
    if (this.socket && this.serverUrl === serverUrl && this.socket.connected) {
      console.log('Socket já conectado, usando conexão existente.');
      return this.socket;
    }

    this.serverUrl = serverUrl || import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'https://multi.compracomsegurancaeconfianca.com';
    console.log(`Inicializando conexão com websocket: ${this.serverUrl}`);

    if (this.socket) {
      try {
        this.socket.removeAllListeners();
        this.socket.disconnect();
      } catch (e) {
        console.error("Erro ao desconectar socket existente:", e);
      }
    }

    this.connectionState = 'connecting';
    this.notifyObservers('connectionState', this.connectionState);

    const token = localStorage.getItem('apiToken') || import.meta.env.VITE_API_TOKEN || '';

    this.socket = io(this.serverUrl, {
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.getExponentialBackoff(),
      timeout: 20000,
      transports: ['websocket', 'polling'],
      autoConnect: true,
      forceNew: true,
      auth: {
        token: token,
        clientType: 'atendente',
        appVersion: '1.0.0'
      },
      query: {
        clientType: 'atendente',
        appVersion: '1.0.0',
        token: token
      }
    });

    this.setupSocketListeners();
    this.setupNetworkListeners();
    this.startPingInterval();
    
    return this.socket;
  }

  getExponentialBackoff() {
    return Math.min(30000, Math.pow(2, this.reconnectAttempts) * this.reconnectDelay);
  }

  setupSocketListeners() {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log(`Socket conectado! ID: ${this.socket.id}`);
      this.socketId = this.socket.id;
      this.reconnectAttempts = 0;
      this.isConnecting = false;
      this.connectionState = 'connected';
      
      if (this.connectionTimeout) {
        clearTimeout(this.connectionTimeout);
        this.connectionTimeout = null;
      }

      if (this.userId && this.userProfile) {
        this.authenticate(this.userId, this.userProfile);
      }

      // Reinscrever-se nas conversas ativas
      if (this.activeSubscriptions.size > 0) {
        console.log(`Reinscrevendo-se em ${this.activeSubscriptions.size} conversas ativas`);
        this.activeSubscriptions.forEach(conversationId => {
          this.socket.emit('subscribe', {
            conversaId: conversationId,
            userId: this.userId,
            token: localStorage.getItem('apiToken') || import.meta.env.VITE_API_TOKEN,
            role: this.userProfile?.role || 'agent'
          });
        });
      }

      if (this.adminSubscribed) {
        this.subscribeToAdminEvents();
      }

      if (this.pendingEvents.length > 0) {
        this.processPendingEvents();
      }

      this.notifyObservers('connect');
      this.notifyObservers('connectionState', this.connectionState);
      
      if (window) {
        window.socketConnected = true;
      }
    });

    this.socket.on('disconnect', (reason) => {
      console.log(`Socket desconectado! Razão: ${reason}`);
      this.socketId = null;
      this.connectionState = 'disconnected';
      
      if (window) {
        window.socketConnected = false;
      }
      
      this.notifyObservers('disconnect', reason);
      this.notifyObservers('connectionState', this.connectionState);
      
      // Não desmarcar como autenticado para manter estado entre reconexões
      
      if (reason === 'io server disconnect' || reason === 'transport close') {
        this.attemptReconnection();
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log(`Socket reconectado após ${attemptNumber} tentativas`);
      this.reconnectAttempts = 0;
      this.connectionState = 'connected';
      this.notifyObservers('connectionState', this.connectionState);
      
      if (window) {
        window.socketConnected = true;
      }
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Tentativa de reconexão ${attemptNumber}/${this.maxReconnectAttempts}`);
      this.reconnectAttempts = attemptNumber;
      this.connectionState = 'connecting';
      this.notifyObservers('connectionState', this.connectionState);
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('Erro ao reconectar socket:', error);
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.connectionState = 'failed';
        this.notifyObservers('connectionState', this.connectionState);
      }
    });

    this.socket.on('reconnect_failed', () => {
      console.error('Reconexão falhou após várias tentativas');
      this.connectionState = 'failed';
      this.notifyObservers('reconnect_failed');
      this.notifyObservers('connectionState', this.connectionState);
      
      this.scheduleReconnection(60000);
    });

    this.socket.on('error', (error) => {
      console.error('Erro no socket:', error);
      this.notifyObservers('error', error);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Erro ao conectar socket:', error);
      this.notifyObservers('connect_error', error);
      
      if (window) {
        window.socketConnected = false;
      }
      
      if (!this.isConnecting && this.networkOnline) {
        this.attemptReconnection();
      }
    });

    this.socket.on('pong', () => {
      this.lastPingTime = Date.now();
    });

    this.socket.on('auth_success', (data) => {
      console.log('Autenticação no socket bem-sucedida:', data);
      this.authenticated = true;
      this.notifyObservers('auth_success', data);
    });

    this.socket.on('auth_error', (error) => {
      console.error('Erro de autenticação no socket:', error);
      this.authenticated = false;
      this.notifyObservers('auth_error', error);
    });

    this.socket.on('nova_mensagem', (data) => {
      if (!data || !data.conversaId || !data.mensagem) {
        console.error('Dados de mensagem inválidos:', data);
        return;
      }

      // Compatibilidade para diferentes formatos
      const conversationId = data.conversaId || data.conversationId;

      if (!this.queuedMessages[conversationId]) {
        this.queuedMessages[conversationId] = [];
      }

      this.queuedMessages[conversationId].push(data.mensagem);
      this.notifyObservers('nova_mensagem', data);
    });

    this.socket.on('conversa_atualizada', (data) => {
      if (!data) {
        console.error('Dados de conversa inválidos:', data);
        return;
      }
      // Vamos ser mais flexíveis com o formato dos dados
      const conversationId = data._id || data.conversaId || data.conversationId;
      if (!conversationId) {
        console.error('ID de conversa não encontrado nos dados:', data);
        return;
      }
      this.notifyObservers('conversa_atualizada', data);
    });

    this.socket.on('typing_indicator', (data) => {
      if (!data) return;
      
      // Compatibilidade para diferentes formatos
      const conversationId = data.conversaId || data.conversationId;
      if (!conversationId) {
        console.error('ID de conversa não encontrado nos dados de typing:', data);
        return;
      }
      
      this.notifyObservers('typing_indicator', data);
    });

    this.socket.on('mensagens_lidas', (data) => {
      if (!data) return;
      
      // Compatibilidade para diferentes formatos
      const conversationId = data.conversaId || data.conversationId;
      if (!conversationId) {
        console.error('ID de conversa não encontrado nos dados de leitura:', data);
        return;
      }
      
      this.notifyObservers('mensagens_lidas', data);
    });

    this.socket.on('nova_conversa', (data) => {
      if (!data || !data._id) {
        console.error('Dados de nova conversa inválidos:', data);
        return;
      }
      this.notifyObservers('nova_conversa', data);
    });

    this.connectionTimeout = setTimeout(() => {
      if (!this.socket.connected) {
        console.warn('Conexão WebSocket não estabelecida após timeout. Tentando reconectar...');
        this.reconnect();
      }
    }, this.connectionTimeoutDuration);
  }

  setupNetworkListeners() {
    window.addEventListener('online', () => {
      console.log('Conectividade de rede restaurada');
      this.networkOnline = true;
      if (!this.socket || !this.socket.connected) {
        this.reconnect();
      }
    });

    window.addEventListener('offline', () => {
      console.log('Conectividade de rede perdida');
      this.networkOnline = false;
      this.connectionState = 'offline';
      this.notifyObservers('connectionState', this.connectionState);
    });
  }

  startPingInterval() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.pingInterval = setInterval(() => {
      if (this.socket && this.socket.connected) {
        const now = Date.now();
        const timeSinceLastPing = now - this.lastPingTime;

        if (timeSinceLastPing > 30000) {
          console.log('Enviando ping para manter conexão ativa');
          this.socket.emit('ping', { timestamp: now });
          this.lastPingTime = now;
        }
      } else if (this.networkOnline && !this.isConnecting && this.connectionState !== 'connecting') {
        this.checkConnection();
      }
    }, 15000);
  }

  checkConnection() {
    if (this.socket && !this.socket.connected && this.networkOnline && !this.isConnecting) {
      console.log('Verificando conexão - socket desconectado, tentando reconectar...');
      this.reconnect();
    }
  }

  authenticate(userId, userProfile) {
    if (!userId) {
      console.error('userId não fornecido para autenticação');
      return false;
    }

    this.userId = userId;
    this.userProfile = userProfile;

    if (!this.socket) {
      this.initialize();
    }

    if (!this.socket.connected) {
      console.log('Socket não conectado. Autenticação será realizada após conexão.');
      this.pendingEvents.push({
        type: 'authenticate',
        data: { userId, userProfile }
      });
      return false;
    }

    console.log(`Autenticando usuário no socket: ${userId}`);
    this.socket.emit('authenticate', {
      userId: userId,
      isAdmin: userProfile?.role === 'admin',
      userName: userProfile?.nome,
      userRole: userProfile?.role || 'agent'
    });

    return true;
  }

  subscribeToConversation(conversationId, isAdmin = false) {
    if (!conversationId) {
      console.error('ID da conversa necessário para inscrição');
      return false;
    }

    this.activeSubscriptions.add(conversationId);

    if (!this.socket) {
      this.initialize();
    }

    if (!this.socket.connected) {
      this.pendingEvents.push({
        type: 'subscribe',
        data: { conversationId, isAdmin }
      });
      return false;
    }

    console.log(`Inscrevendo-se na conversa: ${conversationId}`);
    this.socket.emit('subscribe', {
      conversaId: conversationId,
      userId: this.userId,
      token: localStorage.getItem('apiToken') || import.meta.env.VITE_API_TOKEN,
      role: this.userProfile?.role || 'agent'
    });
    
    // Backup call para versão mais nova da API
    this.socket.emit('subscribe_conversation', { 
      conversationId, 
      isAdmin 
    });
    
    return true;
  }

  unsubscribeFromConversation(conversationId, isAdmin = false) {
    if (!conversationId) return false;

    this.activeSubscriptions.delete(conversationId);

    if (!this.socket || !this.socket.connected) {
      this.pendingEvents = this.pendingEvents.filter(
        event => !(event.type === 'subscribe' && event.data.conversationId === conversationId)
      );
      return false;
    }

    console.log(`Cancelando inscrição na conversa: ${conversationId}`);
    this.socket.emit('unsubscribe', {
      conversaId: conversationId,
      userId: this.userId,
      token: localStorage.getItem('apiToken') || import.meta.env.VITE_API_TOKEN,
      role: this.userProfile?.role || 'agent'
    });
    
    // Backup call para versão mais nova da API
    this.socket.emit('unsubscribe_conversation', {
      conversationId,
      isAdmin
    });
    
    return true;
  }

  sendMessage(conversationId, message, isAdmin = false) {
    if (!conversationId || !message) return false;

    if (!this.socket) {
      this.initialize();
    }

    if (!this.socket.connected) {
      this.pendingEvents.push({
        type: 'message',
        data: { conversationId, message, isAdmin }
      });
      return false;
    }

    console.log(`Enviando mensagem para conversa ${conversationId}: ${message.substring(0, 30)}...`);
    this.socket.emit('send_message', {
      conversaId: conversationId,
      mensagem: message,
      userId: this.userId,
      token: localStorage.getItem('apiToken') || import.meta.env.VITE_API_TOKEN,
      role: this.userProfile?.role || 'agent'
    });
    return true;
  }

  sendTypingIndicator(conversationId, isAdmin = false) {
    if (!conversationId) return false;

    if (!this.socket) {
      this.initialize();
    }

    if (!this.socket.connected) return false;

    this.socket.emit('typing', {
      conversaId: conversationId,
      userId: this.userId,
      token: localStorage.getItem('apiToken') || import.meta.env.VITE_API_TOKEN,
      role: this.userProfile?.role || 'agent'
    });
    
    // Backup call para versão mais nova da API
    this.socket.emit('typing_indicator', {
      conversationId,
      isAdmin
    });
    
    return true;
  }

  markMessagesAsRead(conversationId, isAdmin = false) {
    if (!conversationId) return false;

    if (!this.socket) {
      this.initialize();
    }

    if (!this.socket.connected) {
      this.pendingEvents.push({
        type: 'read',
        data: { conversationId, isAdmin }
      });
      return false;
    }

    console.log(`Marcando mensagens como lidas para conversa: ${conversationId}`);
    this.socket.emit('mark_read', {
      conversaId: conversationId,
      userId: this.userId,
      token: localStorage.getItem('apiToken') || import.meta.env.VITE_API_TOKEN,
      role: this.userProfile?.role || 'agent'
    });

    if (this.queuedMessages[conversationId]) {
      this.queuedMessages[conversationId] = [];
    }

    return true;
  }

  processPendingEvents() {
    if (!this.socket || !this.socket.connected || this.pendingEvents.length === 0) {
      return;
    }

    console.log(`Processando ${this.pendingEvents.length} eventos pendentes`);

    const eventsCopy = [...this.pendingEvents];
    this.pendingEvents = [];

    for (const event of eventsCopy) {
      switch (event.type) {
        case 'authenticate':
          this.authenticate(event.data.userId, event.data.userProfile);
          break;
        case 'subscribe':
          this.subscribeToConversation(event.data.conversationId, event.data.isAdmin);
          break;
        case 'unsubscribe':
          this.unsubscribeFromConversation(event.data.conversationId, event.data.isAdmin);
          break;
        case 'message':
          this.sendMessage(event.data.conversationId, event.data.message, event.data.isAdmin);
          break;
        case 'read':
          this.markMessagesAsRead(event.data.conversationId, event.data.isAdmin);
          break;
        case 'admin_subscribe':
          this.subscribeToAdminEvents();
          break;
        default:
          console.warn(`Tipo de evento desconhecido: ${event.type}`);
      }
    }
  }

  subscribeToAdminEvents() {
    this.adminSubscribed = true;

    if (!this.socket) {
      this.initialize();
    }

    if (!this.socket.connected) {
      this.pendingEvents.push({
        type: 'admin_subscribe',
        data: null
      });
      return false;
    }

    console.log('Inscrevendo-se em eventos de administrador');
    this.socket.emit('admin_subscribe', {
      userId: this.userId,
      token: localStorage.getItem('apiToken') || import.meta.env.VITE_API_TOKEN,
      role: 'admin'
    });
    
    // Backup call para versão mais nova da API
    this.socket.emit('subscribe_admin');
    
    return true;
  }

  unsubscribeFromAdminEvents() {
    this.adminSubscribed = false;

    if (!this.socket || !this.socket.connected) {
      this.pendingEvents = this.pendingEvents.filter(
        event => event.type !== 'admin_subscribe'
      );
      return false;
    }

    console.log('Cancelando inscrição em eventos de administrador');
    this.socket.emit('admin_unsubscribe', {
      userId: this.userId,
      token: localStorage.getItem('apiToken') || import.meta.env.VITE_API_TOKEN,
      role: 'admin'
    });
    return true;
  }

  getQueuedMessages(conversationId) {
    return this.queuedMessages[conversationId] || [];
  }

  clearQueuedMessages(conversationId) {
    if (this.queuedMessages[conversationId]) {
      this.queuedMessages[conversationId] = [];
    }
  }

  on(eventName, callback) {
    if (!this.observers[eventName]) {
      this.observers[eventName] = [];
    }

    this.observers[eventName].push(callback);

    return () => {
      this.observers[eventName] = this.observers[eventName].filter(cb => cb !== callback);
    };
  }

  notifyObservers(eventName, data) {
    if (!this.observers[eventName]) {
      return;
    }

    for (const callback of this.observers[eventName]) {
      try {
        callback(data);
      } catch (error) {
        console.error(`Erro ao notificar observador para evento ${eventName}:`, error);
      }
    }
  }

  attemptReconnection() {
    if (this.isConnecting || !this.networkOnline) {
      return;
    }

    this.reconnect();
  }

  scheduleReconnection(delay) {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    this.reconnectTimer = setTimeout(() => {
      this.reconnect();
    }, delay);
  }

  reconnect() {
    if (this.isConnecting) {
      console.log('Já existe uma tentativa de reconexão em andamento');
      return;
    }

    this.isConnecting = true;
    this.connectionState = 'connecting';
    this.notifyObservers('connectionState', this.connectionState);
    
    console.log('Tentando reconectar socket...');

    if (this.socket) {
      try {
        this.socket.connect();
      } catch (error) {
        console.error('Erro ao reconectar socket:', error);
        // Inicializa do zero se a reconexão falhar
        this.initialize(this.serverUrl);
      }
    } else {
      this.initialize(this.serverUrl);
    }
  }

  disconnect() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }

    if (this.connectionTimeout) {
      clearTimeout(this.connectionTimeout);
      this.connectionTimeout = null;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.socket) {
      console.log('Desconectando WebSocket');
      
      try {
        // Armazenar estado para possível reconexão
        this.pendingEvents = [];
        
        this.socket.disconnect();
      } catch (error) {
        console.error('Erro ao desconectar socket:', error);
      }
    }

    this.isConnecting = false;
    this.socketId = null;
    this.connectionState = 'disconnected';
    this.notifyObservers('connectionState', this.connectionState);
    
    if (window) {
      window.socketConnected = false;
    }
  }

  isConnectedToServer() {
    return this.socket && this.socket.connected;
  }

  isAuthenticated() {
    return this.authenticated;
  }

  getSocketId() {
    return this.socketId;
  }
  
  getConnectionState() {
    return this.connectionState;
  }
  
  getSocket() {
    if (!this.socket) {
      return this.initialize();
    }
    return this.socket;
  }
}

export const socketService = new SocketService();