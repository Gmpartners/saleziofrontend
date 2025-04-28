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
    this.eventListeners = {}; // Armazenar listeners por evento para controle mais fino
    this.lastEventTimestamps = {}; // Controlar timestamps de eventos para evitar duplicatas
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
      this._notifyListeners('error', error);
    });

    // Configurar listener de conexão
    this.socket.on('connect', () => {
      this.log('Socket conectado');
      this.connected = true;
      this._notifyListeners('connect');
    });

    // Configurar listener de desconexão
    this.socket.on('disconnect', (reason) => {
      this.log('Socket desconectado:', reason);
      this.connected = false;
      this._notifyListeners('disconnect', reason);
    });

    // Adicionar log dedicado para novas mensagens
    this.socket.on('nova_mensagem', (data) => {
      console.log('💬 NOVA MENSAGEM RECEBIDA RAW:', data);
      // O processamento continua pelo sistema normal de notificação
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
   * Envia evento aos listeners registrados com controle de taxa
   * para evitar processamento de eventos duplicados
   */
  _notifyListeners(event, ...args) {
    if (!this.eventListeners[event]) return;
    
    // Definir eventos críticos que não devem sofrer throttling
    const criticalEvents = ['nova_mensagem', 'nova_conversa'];
    
    // Processar IMEDIATAMENTE eventos críticos, sem throttling ou delay
    if (criticalEvents.includes(event)) {
      this.log(`Notificando ${this.eventListeners[event].length} listeners para evento crítico: ${event}`);
      
      // Processar imediatamente, sem requestAnimationFrame
      this.eventListeners[event].forEach(listener => {
        try {
          listener(...args);
        } catch (error) {
          console.error(`Erro ao processar evento crítico ${event}:`, error);
        }
      });
      return;
    }
    
    // Para eventos não críticos, aplicar throttling
    const now = Date.now();
    const minInterval = 100;
    
    if (now - (this.lastEventTimestamps[event] || 0) < minInterval) {
      this.log(`Evento ${event} ignorado (muito frequente)`);
      return;
    }
    
    this.lastEventTimestamps[event] = now;
    this.log(`Notificando ${this.eventListeners[event].length} listeners para evento: ${event}`);
    
    // Usar setTimeout com 0ms para garantir execução no próximo tick do event loop
    setTimeout(() => {
      this.eventListeners[event].forEach(listener => {
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
   * Adiciona listener para um evento com suporte a debounce
   */
  on(event, callback) {
    if (!this.socket) {
      this.log(`Não é possível adicionar listener para evento ${event}, socket não inicializado`);
      return () => {};
    }

    this.log(`Adicionando listener para evento: ${event}`);
    
    // Inicializar array de listeners para o evento se necessário
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
      
      // Configurar o event handler apenas uma vez por tipo de evento
      this.socket.on(event, (...args) => {
        this._notifyListeners(event, ...args);
      });
    }
    
    // Adicionar o callback à lista de listeners para este evento
    this.eventListeners[event].push(callback);
    
    // Retornar função para remover listener
    return () => {
      this.log(`Removendo listener para evento: ${event}`);
      if (this.eventListeners[event]) {
        this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
        
        // Se não tiver mais listeners para este evento, remover do socket
        if (this.eventListeners[event].length === 0) {
          this.socket.off(event);
          delete this.eventListeners[event];
        }
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
    if (this.socket.offAny) {
      this.socket.offAny();
    } else {
      // Limpar cada evento individualmente como fallback
      Object.keys(this.eventListeners).forEach(event => {
        this.socket.off(event);
      });
    }
    
    this.eventListeners = {};
    this.lastEventTimestamps = {};
    
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

    console.log('💬 SIMULANDO NOVA MENSAGEM:', mockData);
    // Notificar através do sistema padronizado
    this._notifyListeners('nova_mensagem', mockData);
    return mockData;
  }
}

// Exportar instância única
export const socketService = new SocketService();