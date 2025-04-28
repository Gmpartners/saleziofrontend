import { io } from 'socket.io-client';

/**
 * Serviço para gerenciar comunicação WebSocket
 */
class SocketService {
  constructor() {
    this.socket = null;
    this.rooms = new Set();
    this.userId = null;
    this.role = null;
    this.sectorId = null;
    this.connected = false;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
    this.listeners = {};
    this.debug = true; // Facilita debug em desenvolvimento
  }

  /**
   * Logger condicional para debug
   */
  log(...args) {
    if (this.debug) {
      console.log('[Socket]', ...args);
    }
  }

  /**
   * Configura o socket para o usuário
   */
  setupForUser(url, userId, role, sectorId) {
    // Se o socket já estiver configurado para o mesmo usuário e setor, não faça nada
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

    // Se já tiver um socket, desconecte-o antes de criar um novo
    if (this.socket) {
      this.log('Desconectando socket existente antes de criar novo');
      this.disconnect();
    }

    this.log(`Conectando ao WebSocket: ${url} com ID: ${userId}`);
    this.userId = userId;
    this.role = role;
    this.sectorId = sectorId ? (sectorId._id || sectorId.id || sectorId) : null;

    // Criar novo socket
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
      transports: ['websocket', 'polling']
    });

    // Entrar nas salas
    this._joinDefaultRooms();

    // Configurar listener de reconexão para rejuntar às salas
    this.socket.io.on('reconnect', () => {
      this.log('Socket reconectado, rejuntando às salas');
      this._rejoinRooms();
    });

    // Configurar listener de erro
    this.socket.io.on('error', (error) => {
      this.log('Erro no socket:', error);
    });

    // Salvar estado conectado
    this.connected = this.socket.connected;
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
    if (!this.socket) return;

    if (this.rooms.size > 0) {
      this.log(`Reconectando a ${this.rooms.size} salas:`, Array.from(this.rooms));
      
      this.rooms.forEach(room => {
        this.socket.emit('join', room);
        this.log(`Reconectado à sala: ${room}`);
      });
    }
  }

  /**
   * Entra em uma sala
   */
  joinRoom(room) {
    if (!this.socket) {
      this.log(`Não é possível entrar na sala ${room}, socket não inicializado`);
      return;
    }

    if (this.rooms.has(room)) {
      this.log(`Já está na sala: ${room}`);
      return;
    }

    this.log(`Entrando na sala: ${room}`);
    this.socket.emit('join', room);
    this.rooms.add(room);
  }

  /**
   * Sai de uma sala
   */
  leaveRoom(room) {
    if (!this.socket) return;

    this.log(`Saindo da sala: ${room}`);
    this.socket.emit('leave', room);
    this.rooms.delete(room);
  }

  /**
   * Adiciona listener para um evento
   */
  on(event, callback) {
    if (!this.socket) {
      this.log(`Não é possível adicionar listener para evento ${event}, socket não inicializado`);
      return () => {};
    }

    this.log(`Adicionando listener para evento: ${event}`);
    
    // Manter controle dos listeners para cada evento
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    
    this.listeners[event].push(callback);
    
    // Adicionar listener ao socket
    this.socket.on(event, (...args) => {
      this.log(`Notificando ${this.listeners[event].length} listeners para evento: ${event}`);
      this.listeners[event].forEach(listener => listener(...args));
    });
    
    // Retornar função para remover listener
    return () => {
      this.log(`Removendo listener para evento: ${event}`);
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
      
      // Se não tiver mais listeners para este evento, remover do socket
      if (this.listeners[event].length === 0) {
        this.socket.off(event);
        delete this.listeners[event];
      }
    };
  }

  /**
   * Verifica se o socket está conectado
   */
  isConnected() {
    return this.socket && this.socket.connected;
  }

  /**
   * Desconecta o socket
   */
  disconnect() {
    if (!this.socket) return;

    this.log('Desconectando socket');
    
    // Limpar listeners para evitar vazamentos de memória
    Object.keys(this.listeners).forEach(event => {
      this.socket.off(event);
    });
    
    this.listeners = {};
    
    // Desconectar socket
    this.socket.disconnect();
    this.connected = false;
    this.socket = null;
    this.rooms.clear();
  }

  /**
   * Simula o recebimento de uma nova mensagem (para testes)
   */
  simulateNewMessage(conversaId, texto = "Mensagem simulada de teste") {
    const mockData = {
      conversaId: conversaId,
      mensagem: {
        _id: `mock-${Date.now()}`,
        conteudo: texto,
        remetente: 'cliente',
        timestamp: new Date().toISOString(),
        status: 'sent'
      }
    };

    // Se tiver listeners para o evento nova_mensagem, notificar
    if (this.listeners['nova_mensagem'] && this.listeners['nova_mensagem'].length > 0) {
      this.listeners['nova_mensagem'].forEach(listener => listener(mockData));
    }

    return mockData;
  }
}

// Exportar instância única
export const socketService = new SocketService();