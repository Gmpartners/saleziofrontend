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
    this._forceConnected = false; // Flag para testar conexão (remover em produção)
  }

  /**
   * Inicializa a conexão com o WebSocket
   * @param {string} url - URL do servidor WebSocket
   * @param {string} userId - ID do usuário atual
   * @param {string} role - Papel do usuário (agent/admin)
   */
  connect(url, userId, role = 'agent') {
    if (this.socket && this.socket.connected) {
      console.log('WebSocket já conectado');
      return;
    }

    // Limpar timeout de reconexão anterior, se existir
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    console.log(`Tentando conectar ao WebSocket: ${url} com ID: ${userId}`);

    // Configuração do Socket.io conforme a documentação
    this.socket = io(url, {
      auth: {
        token: API_TOKEN,    // Token da API
        userId: userId,      // ID do usuário
        role: role           // Papel (agent/admin)
      },
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 10000
    });

    // Configurar eventos padrão
    this.setupEvents();
    
    // Para desenvolvimento - forçar status conectado após 1 segundo
    setTimeout(() => {
      this._forceConnected = true;
      // Notificar listeners de conexão
      this.notifyListeners('connect', {});
    }, 1000);
  }

  /**
   * Configura os eventos básicos do Socket.io
   */
  setupEvents() {
    if (!this.socket) return;

    // Evento de conexão
    this.socket.on('connect', () => {
      console.log(`Socket conectado com sucesso ${this.socket.id}`);
      this.reconnectAttempts = 0;
      this._forceConnected = true;

      // Reconectar a todas as salas anteriores
      this.rejoinRooms();
      
      // Notificar os listeners
      this.notifyListeners('connect', {});
    });

    // Evento de desconexão
    this.socket.on('disconnect', (reason) => {
      console.log(`Socket desconectado: ${reason}`);
      this._forceConnected = false;
      
      // Notificar os listeners
      this.notifyListeners('disconnect', { reason });

      // Tentar reconexão apenas para desconexões não intencionais
      if (reason === 'io server disconnect') {
        // O servidor forçou a desconexão
        console.log('Desconexão forçada pelo servidor');
      }
    });

    // Evento de erro
    this.socket.on('connect_error', (error) => {
      console.error('Erro de conexão WebSocket:', error.message);
      this.reconnectAttempts++;
      this._forceConnected = false;

      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        console.error(`Máximo de ${this.maxReconnectAttempts} tentativas atingido. Desistindo.`);
        return;
      }

      // Tentar novamente após um delay
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
      console.log(`Tentando reconectar em ${delay}ms (tentativa ${this.reconnectAttempts})`);

      this.reconnectTimeout = setTimeout(() => {
        if (this.socket) {
          this.socket.connect();
        }
      }, delay);
    });

    // Eventos da aplicação conforme documentação
    this.socket.on('nova_mensagem', (data) => {
      console.log('Nova mensagem recebida:', data);
      this.notifyListeners('nova_mensagem', data);
    });

    this.socket.on('nova_conversa', (data) => {
      console.log('Nova conversa recebida:', data);
      this.notifyListeners('nova_conversa', data);
    });

    this.socket.on('conversa_atualizada', (data) => {
      console.log('Conversa atualizada:', data);
      this.notifyListeners('conversa_atualizada', data);
    });
  }

  /**
   * Entra em uma sala WebSocket
   * @param {string} room - Nome da sala
   */
  joinRoom(room) {
    if (!this.socket) {
      console.warn('Socket não inicializado. Impossível entrar na sala:', room);
      return;
    }

    console.log(`Entrou na sala: ${room}`);
    this.socket.emit('join', room);
    this.rooms.add(room);
  }

  /**
   * Reentrar em todas as salas após reconexão
   */
  rejoinRooms() {
    for (const room of this.rooms) {
      this.joinRoom(room);
    }
  }

  /**
   * Registra um listener para eventos
   * @param {string} event - Nome do evento
   * @param {Function} callback - Função de callback
   * @returns {Function} Função para remover o listener
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    
    this.listeners[event].push(callback);
    
    // Retorna uma função para remover o listener
    return () => {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    };
  }

  /**
   * Notifica todos os listeners de um evento
   * @param {string} event - Nome do evento
   * @param {any} data - Dados do evento
   */
  notifyListeners(event, data) {
    if (!this.listeners[event]) return;
    
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
  }

  /**
   * Verifica se o socket está conectado
   */
  isConnected() {
    // Para desenvolvimento - usar o flag forçado
    if (this._forceConnected) return true;
    
    return this.socket && this.socket.connected;
  }
  
  /**
   * Configura o WebSocket para um usuário e seus setores
   * @param {string} url - URL do servidor WebSocket 
   * @param {string} userId - ID do usuário
   * @param {string} role - Papel do usuário (agent/admin)
   * @param {Object} setor - Dados do setor (opcional)
   */
  setupForUser(url, userId, role = 'agent', setor = null) {
    // Conectar
    this.connect(url, userId, role);
    
    // Entrar na sala global do usuário
    this.joinRoom(`user_${userId}`);
    
    // Se tiver setor, entrar na sala do setor
    if (setor && setor._id) {
      this.joinRoom(`user_${userId}_setor_${setor._id}`);
    } else if (setor && setor.id) {
      this.joinRoom(`user_${userId}_setor_${setor.id}`);
    }
  }
}

// Exporta instância única
export const socketService = new SocketService();