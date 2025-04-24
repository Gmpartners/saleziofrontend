// services/socket.js
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'https://api.devoltaaojogo.com';

class SocketService {
  constructor() {
    this.socket = null;
    this.listeners = new Map();
    this._isConnected = false;
  }

  /**
   * Conecta ao servidor Socket.IO
   * @returns {Promise<SocketService>} Promessa que resolve para a instância atual
   */
  connect() {
    return new Promise((resolve, reject) => {
      try {
        const token = localStorage.getItem('authToken');
        
        if (!token) {
          console.warn('Tentativa de conectar ao socket sem token de autenticação');
          reject(new Error('Usuário não autenticado'));
          return;
        }
        
        // Desconectar se já estiver conectado
        if (this.socket) {
          this.disconnect();
        }
        
        // Configurações do Socket.IO
        const socketOptions = {
          auth: { token },
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 3000,
          timeout: 10000
        };
        
        // Criar nova conexão
        this.socket = io(SOCKET_URL, socketOptions);
        
        // Configurar eventos básicos
        this.socket.on('connect', () => {
          console.log('Socket conectado com sucesso');
          this._isConnected = true;
          resolve(this);
        });
        
        this.socket.on('connect_error', (error) => {
          console.error('Erro na conexão Socket:', error);
          this._isConnected = false;
          
          // Não rejeitar a promessa para não quebrar o fluxo da aplicação
          // O usuário pode ver o status de conexão na interface
        });
        
        this.socket.on('disconnect', (reason) => {
          console.log(`Socket desconectado: ${reason}`);
          this._isConnected = false;
          
          // Reconectar automaticamente em caso de desconexão pelo servidor
          if (reason === 'io server disconnect') {
            setTimeout(() => this.socket.connect(), 5000);
          }
        });
        
        // Timeout para caso a conexão não seja estabelecida
        setTimeout(() => {
          if (!this._isConnected) {
            console.warn('Timeout ao conectar ao socket');
            // Não rejeitar para evitar quebrar o fluxo
            resolve(this);
          }
        }, 5000);
      } catch (error) {
        console.error('Erro ao inicializar socket:', error);
        this._isConnected = false;
        reject(error);
      }
    });
  }

  /**
   * Verifica se o socket está conectado
   * @returns {boolean} Estado da conexão
   */
  isConnected() {
    return this._isConnected && this.socket?.connected;
  }
  
  /**
   * Reconecta ao servidor em caso de falha
   */
  reconnect() {
    if (!this._isConnected && this.socket) {
      console.log('Tentando reconectar ao socket...');
      this.socket.connect();
    } else if (!this.socket) {
      this.connect().catch(err => {
        console.error('Falha ao reconectar:', err);
      });
    }
  }

  /**
   * Registra um listener para um evento
   * @param {string} event Nome do evento
   * @param {Function} callback Função a ser chamada
   * @returns {SocketService} A instância atual para encadeamento
   */
  on(event, callback) {
    try {
      if (!this.socket) {
        console.warn('Socket não inicializado ao tentar registrar evento:', event);
        return this;
      }
      
      this.socket.on(event, callback);
      this.listeners.set(event, callback);
      
      return this;
    } catch (error) {
      console.error(`Erro ao registrar listener para "${event}":`, error);
      return this;
    }
  }

  /**
   * Remove um listener de evento
   * @param {string} event Nome do evento
   * @returns {SocketService} A instância atual para encadeamento
   */
  off(event) {
    try {
      if (!this.socket) return this;
      
      const callback = this.listeners.get(event);
      if (callback) {
        this.socket.off(event, callback);
        this.listeners.delete(event);
      }
      
      return this;
    } catch (error) {
      console.error(`Erro ao remover listener para "${event}":`, error);
      return this;
    }
  }

  /**
   * Emite um evento para o servidor
   * @param {string} event Nome do evento
   * @param {any} data Dados a serem enviados
   * @returns {SocketService} A instância atual para encadeamento
   */
  emit(event, data) {
    try {
      if (!this.socket) {
        console.warn('Socket não inicializado ao tentar emitir evento:', event);
        return this;
      }
      
      this.socket.emit(event, data);
      return this;
    } catch (error) {
      console.error(`Erro ao emitir evento "${event}":`, error);
      return this;
    }
  }

  /**
   * Desconecta do servidor
   * @returns {SocketService} A instância atual para encadeamento
   */
  disconnect() {
    try {
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
        this.listeners.clear();
        this._isConnected = false;
      }
      
      return this;
    } catch (error) {
      console.error('Erro ao desconectar socket:', error);
      return this;
    }
  }

  /**
   * Solicita a lista de conversas
   * @param {Object} params Parâmetros de filtragem
   */
  requestConversationsList(params = { status: ['aguardando', 'em_andamento'] }) {
    this.emit('conversas:listar', params);
  }

  /**
   * Seleciona uma conversa para atendimento
   * @param {string} conversationId ID da conversa
   */
  selectConversation(conversationId) {
    this.emit('conversa:selecionar', conversationId);
  }

  /**
   * Envia uma mensagem para o cliente
   * @param {string} conversationId ID da conversa
   * @param {string} text Texto da mensagem
   */
  sendMessage(conversationId, text) {
    this.emit('mensagem:enviar', {
      conversaId: conversationId,
      texto: text
    });
  }

  /**
   * Transfere uma conversa para outro setor
   * @param {string} conversationId ID da conversa
   * @param {string} sector Novo setor
   */
  transferConversation(conversationId, sector) {
    this.emit('conversa:transferir', {
      conversaId: conversationId,
      novoSetor: sector
    });
  }

  /**
   * Finaliza uma conversa
   * @param {string} conversationId ID da conversa
   */
  finishConversation(conversationId) {
    this.emit('conversa:finalizar', conversationId);
  }
}

// Exporta uma única instância do serviço
export default new SocketService();