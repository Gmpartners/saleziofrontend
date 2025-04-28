import { io } from 'socket.io-client';
import { API_TOKEN } from '../config/syncConfig';

/**
 * Serviço para gerenciamento de WebSocket
 */
class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.reconnectTimeout = null;
    this.rooms = new Set();
    this._forceConnected = false; // Flag para testes
    this.isInitialized = false;
    this.debugMode = true; // Ativar logs
  }

  /**
   * Log condicional para depuração
   */
  log(...args) {
    if (this.debugMode) {
      console.log('[Socket]', ...args);
    }
  }

  /**
   * Inicializa a conexão com o WebSocket
   */
  connect(url, userId, role = 'agent') {
    // Evitar conexões duplicadas
    if (this.socket && this.socket.connected) {
      this.log('WebSocket já conectado');
      return;
    }

    if (this.isInitialized && this.socket) {
      this.log('WebSocket já inicializado, reconectando');
      this.socket.connect();
      return;
    }

    // Limpar timeout de reconexão anterior
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.log(`Conectando ao WebSocket: ${url} com ID: ${userId}`);

    // Configuração do Socket.io
    this.socket = io(url, {
      auth: {
        token: API_TOKEN,
        userId: userId,
        role: role
      },
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 3000,
      reconnectionDelayMax: 10000,
      timeout: 10000,
      transports: ['websocket'],
      forceNew: false
    });

    // Configurar eventos padrão
    this.setupEvents();
    this.isInitialized = true;
    
    // Para desenvolvimento - forçar status conectado
    setTimeout(() => {
      this._forceConnected = true;
      this.notifyListeners('connect', {});
    }, 1000);
  }

  /**
   * Configura os eventos básicos do Socket.io
   */
  setupEvents() {
    if (!this.socket) return;

    // Conexão
    this.socket.on('connect', () => {
      this.log(`Socket conectado: ${this.socket.id}`);
      this.reconnectAttempts = 0;
      this._forceConnected = true;

      // Reconectar a todas as salas
      this.rejoinRooms();
      
      // Notificar listeners
      this.notifyListeners('connect', {});
    });

    // Desconexão
    this.socket.on('disconnect', (reason) => {
      this.log(`Socket desconectado: ${reason}`);
      this._forceConnected = false;
      
      // Notificar listeners
      this.notifyListeners('disconnect', { reason });
    });

    // Erro
    this.socket.on('connect_error', (error) => {
      this.log(`Erro de conexão: ${error.message}`);
      this.reconnectAttempts++;
      this._forceConnected = false;

      // Notificar erro
      this.notifyListeners('error', { error });

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.log(`Máximo de ${this.maxReconnectAttempts} tentativas atingido`);
        return;
      }

      // Tentar novamente após um delay
      if (!this.reconnectTimeout) {
        const delay = Math.min(3000 * Math.pow(1.5, this.reconnectAttempts), 30000);
        this.log(`Tentando reconectar em ${delay}ms (tentativa ${this.reconnectAttempts})`);

        this.reconnectTimeout = setTimeout(() => {
          this.reconnectTimeout = null;
          if (this.socket) {
            this.socket.connect();
          }
        }, delay);
      }
    });

    // Eventos da aplicação (MELHORADOS)
    // Nova mensagem
    this.socket.on('nova_mensagem', (data) => {
      this.log('📩 Nova mensagem recebida:', data);
      
      // Garantir que a mensagem tem todos os campos necessários
      if (data && data.mensagem) {
        // Garantir que a mensagem tem o campo remetente
        if (!data.mensagem.remetente) {
          data.mensagem.remetente = 'cliente';
        }
        
        // Garantir que a mensagem tem um ID
        if (!data.mensagem._id) {
          data.mensagem._id = `msg-${Date.now()}-${Math.random().toString(36).substring(2)}`;
        }
      }
      
      // Notificar listeners
      this.notifyListeners('nova_mensagem', data);
    });

    // Nova conversa
    this.socket.on('nova_conversa', (data) => {
      this.log('Nova conversa recebida:', data);
      this.notifyListeners('nova_conversa', data);
    });

    // Conversa atualizada
    this.socket.on('conversa_atualizada', (data) => {
      this.log('Conversa atualizada:', data);
      this.notifyListeners('conversa_atualizada', data);
    });
    
    // Auto-teste a cada 10 segundos para manter conexão ativa
    setInterval(() => {
      if (this.socket && this.socket.connected) {
        this.socket.emit('ping', { timestamp: Date.now() });
      }
    }, 10000);
  }

  /**
   * Envia uma mensagem via WebSocket
   */
  emit(event, data) {
    if (!this.socket) {
      this.log(`Não é possível emitir ${event}, socket não inicializado`);
      return false;
    }
    
    this.log(`Emitindo evento ${event}:`, data);
    this.socket.emit(event, data);
    return true;
  }

  /**
   * Entra em uma sala WebSocket
   */
  joinRoom(room) {
    if (!this.socket) {
      this.log(`Não é possível entrar na sala ${room}, socket não inicializado`);
      return;
    }

    // Verificar se já está na sala
    if (this.rooms.has(room)) {
      this.log(`Já está na sala: ${room}`);
      return;
    }

    this.log(`Entrando na sala: ${room}`);
    this.socket.emit('join', room);
    this.rooms.add(room);
  }

  /**
   * Reentrar em todas as salas após reconexão
   */
  rejoinRooms() {
    const roomsArray = Array.from(this.rooms);
    this.log(`Reconectando a ${roomsArray.length} salas:`, roomsArray);
    
    for (const room of roomsArray) {
      if (this.socket) {
        this.socket.emit('join', room);
        this.log(`Reconectado à sala: ${room}`);
      }
    }
  }

  /**
   * Registra um listener para eventos
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    
    // Não duplicar callbacks
    if (!this.listeners[event].some(cb => cb === callback)) {
      this.log(`Adicionando listener para evento: ${event}`);
      this.listeners[event].push(callback);
    }
    
    // Retorna função para remover
    return () => {
      this.log(`Removendo listener para evento: ${event}`);
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  /**
   * Notifica todos os listeners de um evento
   */
  notifyListeners(event, data) {
    if (!this.listeners[event] || this.listeners[event].length === 0) {
      return;
    }
    
    this.log(`Notificando ${this.listeners[event].length} listeners para evento: ${event}`);
    
    this.listeners[event].forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error(`Erro em listener para evento ${event}:`, error);
      }
    });
  }

  /**
   * Desconecta do WebSocket
   */
  disconnect() {
    this.log('Desconectando socket');
    this._forceConnected = false;
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.rooms.clear();
    this.reconnectAttempts = 0;
    this.isInitialized = false;
  }

  /**
   * Verifica se o socket está conectado
   */
  isConnected() {
    // Para testes - usar flag forçado em desenvolvimento
    if (this._forceConnected) return true;
    
    return this.socket && this.socket.connected;
  }
  
  /**
   * Configura o WebSocket para um usuário e seus setores
   */
  setupForUser(url, userId, role = 'agent', setor = null) {
    // Conectar
    this.connect(url, userId, role);
    
    // Entrar na sala global do usuário
    this.joinRoom(`user_${userId}`);
    
    // Se tiver setor, entrar na sala do setor
    if (setor && (setor._id || setor.id)) {
      const setorId = setor._id || setor.id;
      this.joinRoom(`user_${userId}_setor_${setorId}`);
    }
  }
  
  /**
   * Simula recebimento de mensagem (para testes)
   */
  simulateNewMessage(conversaId, texto = "Mensagem de teste") {
    const mockMessage = {
      conversaId: conversaId,
      mensagem: {
        _id: `test-${Date.now()}`,
        conversaId: conversaId,
        conteudo: texto,
        remetente: 'cliente',
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
    };
    
    this.log('Simulando nova mensagem:', mockMessage);
    this.notifyListeners('nova_mensagem', mockMessage);
    return mockMessage;
  }
}

// Exporta instância única
export const socketService = new SocketService();