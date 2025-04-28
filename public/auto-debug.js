/**
 * Ferramenta de diagnóstico automático para o componente StandaloneChat
 * 
 * Este script será automaticamente injetado quando o componente StandaloneChat for montado.
 * Ele verifica possíveis problemas e tenta resolvê-los automaticamente.
 */

// Diagnóstico periódico
window.chatDiagnostics = {
  // Timestamp da última mensagem enviada
  lastMessageSent: null,
  
  // Timestamp da última mensagem recebida
  lastMessageReceived: null,
  
  // Estado da conexão do socket
  socketConnected: false,
  
  // Contador de tentativas de envio
  sendAttempts: 0,
  
  // Contador de tentativas de recebimento
  receiveAttempts: 0,
  
  // Referência ao socket do componente
  socket: null,
  
  // Iniciar diagnóstico
  start: function() {
    console.log('%c🔍 Diagnóstico do chat iniciado', 'background:#3498db; color:white; padding:3px; border-radius:3px;');
    
    // Monitorar eventos de network
    this.monitorNetwork();
    
    // Monitorar eventos relevantes
    document.addEventListener('chat:message:sent', (e) => {
      this.lastMessageSent = Date.now();
      this.sendAttempts++;
      console.log('📤 Evento de mensagem enviada detectado', e.detail);
    });
    
    document.addEventListener('chat:message:received', (e) => {
      this.lastMessageReceived = Date.now();
      this.receiveAttempts++;
      console.log('📥 Evento de mensagem recebida detectado', e.detail);
    });
    
    document.addEventListener('chat:socket:connected', (e) => {
      this.socketConnected = true;
      this.socket = e.detail.socket;
      console.log('🔌 Socket conectado', e.detail);
    });
    
    document.addEventListener('chat:socket:disconnected', (e) => {
      this.socketConnected = false;
      console.log('🔌 Socket desconectado', e.detail);
    });
    
    // Verificar periodicamente
    setInterval(() => this.checkStatus(), 10000);
  },
  
  // Verificar status do chat
  checkStatus: function() {
    const now = Date.now();
    
    // Verificar conexão do socket
    if (!this.socketConnected) {
      console.warn('⚠️ Socket desconectado há mais de 10 segundos. Tentando reconectar...');
      this.tryReconnectSocket();
    }
    
    // Verificar se há mensagens presas no estado "sending"
    this.checkStuckMessages();
  },
  
  // Monitorar tráfego de rede
  monitorNetwork: function() {
    const originalFetch = window.fetch;
    const self = this;
    
    // Sobrescrever fetch para monitorar requisições
    window.fetch = function(...args) {
      const url = args[0];
      const options = args[1] || {};
      
      // Se for uma requisição relacionada ao chat
      if (typeof url === 'string' && url.includes('conversas')) {
        console.log(`🌐 Requisição capturada: ${options.method || 'GET'} ${url}`);
        
        // Medir tempo de resposta
        const startTime = Date.now();
        
        return originalFetch.apply(this, args)
          .then(response => {
            const time = Date.now() - startTime;
            console.log(`✅ Resposta recebida: ${response.status} (${time}ms)`);
            return response;
          })
          .catch(error => {
            console.error(`❌ Erro na requisição: ${error.message}`);
            throw error;
          });
      }
      
      return originalFetch.apply(this, args);
    };
    
    // Monitorar XMLHttpRequest também
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(...args) {
      const method = args[0];
      const url = args[1];
      
      if (typeof url === 'string' && url.includes('conversas')) {
        console.log(`🌐 XHR capturado: ${method} ${url}`);
        
        this.addEventListener('load', function() {
          console.log(`✅ XHR completo: ${this.status}`);
        });
        
        this.addEventListener('error', function() {
          console.error('❌ XHR falhou');
        });
      }
      
      return originalXHROpen.apply(this, args);
    };
  },
  
  // Verificar mensagens presas
  checkStuckMessages: function() {
    const chatContainer = document.querySelector('.chat-messages-container');
    if (!chatContainer) return;
    
    const stuckMessages = Array.from(chatContainer.querySelectorAll('[data-status="sending"]'));
    
    if (stuckMessages.length > 0) {
      console.warn(`⚠️ ${stuckMessages.length} mensagens estão presas em "sending". Tentando recuperar...`);
      
      // Tentar disparar evento para recuperar
      document.dispatchEvent(new CustomEvent('chat:recover:stuck-messages', {
        detail: { messages: stuckMessages.map(el => el.dataset.messageId) }
      }));
    }
  },
  
  // Tentar reconectar socket
  tryReconnectSocket: function() {
    if (this.socket && typeof this.socket.connect === 'function') {
      console.log('🔄 Tentando reconectar socket...');
      this.socket.connect();
    } else {
      console.error('❌ Não foi possível reconectar socket, referência inválida');
      
      // Tentar forçar recarregamento do componente
      document.dispatchEvent(new CustomEvent('chat:force:reload'));
    }
  },
  
  // Injetar função de teste no componente
  injectTestFunctions: function() {
    window.testChatSendMessage = (text = "Mensagem de teste") => {
      const form = document.querySelector('.chat-form');
      const input = document.querySelector('.chat-input');
      const button = document.querySelector('.chat-send-button');
      
      if (!form || !input || !button) {
        console.error('❌ Elementos do chat não encontrados');
        return false;
      }
      
      input.value = text;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      
      console.log('🚀 Mensagem de teste enviada:', text);
      return true;
    };
    
    console.log('%c🧪 Funções de teste do chat injetadas! Use window.testChatSendMessage("sua mensagem")', 
                'background:#2ecc71; color:white; padding:3px; border-radius:3px;');
  }
};

// Detectar quando o componente StandaloneChat for montado
function waitForStandaloneChat() {
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.addedNodes.length) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Verificar se o componente StandaloneChat foi montado
            if (node.className && typeof node.className === 'string' && 
                (node.className.includes('flex-col h-full bg-gray-900') || 
                 node.querySelector('form'))) {
              console.log('🔍 StandaloneChat detectado! Iniciando diagnóstico...');
              
              // Adicionar classes para identificar elementos
              if (node.querySelector('form')) {
                node.querySelector('form').classList.add('chat-form');
                node.querySelector('input[type="text"]').classList.add('chat-input');
                node.querySelector('button[type="submit"]').classList.add('chat-send-button');
                
                if (node.querySelector('.flex-1.overflow-y-auto')) {
                  node.querySelector('.flex-1.overflow-y-auto').classList.add('chat-messages-container');
                }
              }
              
              // Iniciar diagnóstico
              window.chatDiagnostics.start();
              window.chatDiagnostics.injectTestFunctions();
              
              // Parar de observar após encontrar
              observer.disconnect();
              break;
            }
          }
        }
      }
    }
  });
  
  // Iniciar observação
  observer.observe(document.body, { childList: true, subtree: true });
}

// Iniciar quando o documento estiver pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', waitForStandaloneChat);
} else {
  waitForStandaloneChat();
}

console.log('%c📊 Ferramenta de diagnóstico automático do chat carregada', 
           'background:#9b59b6; color:white; padding:5px; border-radius:3px; font-weight:bold;');