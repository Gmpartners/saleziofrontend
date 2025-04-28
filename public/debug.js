/**
 * Utilitários de depuração para o chat
 * Para usar, cole este código no console do navegador:
 *
 * var script = document.createElement('script');
 * script.src = '/debug.js';
 * document.head.appendChild(script);
 */

// Função para testar envio de mensagem
function testSendMessage(text = 'Teste de mensagem enviada') {
  // Acessar o ChatContext
  const conversationDetail = document.getElementById('conversation-detail');
  if (!conversationDetail) {
    console.error('❌ Componente de conversa não encontrado!');
    return false;
  }

  // Enviar mensagem simulada
  const messageInput = conversationDetail.querySelector('input[type="text"]');
  const sendButton = conversationDetail.querySelector('button[type="submit"]');
  
  if (!messageInput || !sendButton) {
    console.error('❌ Elementos de input não encontrados!');
    return false;
  }
  
  // Definir texto
  const originalValue = messageInput.value;
  messageInput.value = text;
  
  // Disparar eventos
  messageInput.dispatchEvent(new Event('input', { bubbles: true }));
  sendButton.click();
  
  console.log('✅ Mensagem de teste enviada:', text);
  return true;
}

// Função para testar recebimento de mensagem
function testReceiveMessage(text = 'Teste de mensagem recebida') {
  try {
    // Encontrar objeto de contexto do socket
    const socketProvider = document.querySelector('[data-socket-context]');
    if (!socketProvider) {
      console.error('❌ Contexto do socket não encontrado!');
      return false;
    }
    
    // Obter ID da conversa atual
    const conversationDetail = document.getElementById('conversation-detail');
    if (!conversationDetail) {
      console.error('❌ Componente de conversa não encontrado!');
      return false;
    }
    
    // Buscar conversa atual via React DevTools
    const findReactComponent = (element) => {
      const key = Object.keys(element).find(key => {
        return key.startsWith('__reactFiber$') || key.startsWith('__reactInternalInstance$');
      });
      
      if (!key) return null;
      
      return element[key];
    };
    
    const getSelectedConversationId = () => {
      // Tentar várias abordagens para encontrar o ID
      
      // 1. Verificar URL
      const match = window.location.pathname.match(/\/conversations\/([^\/]+)/);
      if (match && match[1]) {
        return match[1];
      }
      
      // 2. Tentar via React DevTools
      try {
        const fiber = findReactComponent(conversationDetail);
        if (fiber) {
          let current = fiber;
          
          // Navegar pela árvore de componentes
          while (current) {
            if (current.memoizedProps && current.memoizedProps.conversation) {
              return current.memoizedProps.conversation._id;
            }
            
            if (current.memoizedState && current.memoizedState.selectedConversation) {
              return current.memoizedState.selectedConversation._id;
            }
            
            // Próximo na árvore
            current = current.return;
          }
        }
      } catch (e) {
        console.warn('Erro ao buscar via React DevTools:', e);
      }
      
      // 3. Tentar via data-attribute
      const conversationIdAttribute = conversationDetail.getAttribute('data-conversation-id');
      if (conversationIdAttribute) {
        return conversationIdAttribute;
      }
      
      return null;
    };
    
    const conversationId = getSelectedConversationId();
    if (!conversationId) {
      console.error('❌ Não foi possível determinar o ID da conversa atual!');
      return false;
    }
    
    // Criar mensagem simulada
    const mockMessage = {
      conversaId: conversationId,
      mensagem: {
        _id: `mock-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        conversaId: conversationId,
        conteudo: text,
        remetente: 'cliente',
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString()
      }
    };
    
    // Disparar evento personalizado para simular recebimento
    const event = new CustomEvent('socket-message', { 
      detail: { 
        type: 'nova_mensagem',
        data: mockMessage
      },
      bubbles: true
    });
    
    document.dispatchEvent(event);
    
    // Se o evento personalizado não funcionar, tente acessar o socket diretamente
    try {
      window.socketService = window.socketService || {};
      
      if (typeof window.socketService.simulateNewMessage === 'function') {
        window.socketService.simulateNewMessage(conversationId, text);
        console.log('✅ Mensagem simulada via socketService');
        return true;
      }
    } catch (e) {
      console.warn('Erro ao acessar socketService:', e);
    }
    
    console.log('✅ Evento de mensagem recebida disparado:', mockMessage);
    return true;
  } catch (error) {
    console.error('❌ Erro ao simular mensagem recebida:', error);
    return false;
  }
}

// Mostrar instruções
console.log(`
🔧 Utilitários de depuração carregados!

Funções disponíveis:
- testSendMessage("Sua mensagem aqui") - Testa envio de mensagem
- testReceiveMessage("Mensagem simulada") - Testa recebimento de mensagem

Exemplo:
  testSendMessage("Olá, isto é um teste");
  testReceiveMessage("Resposta de teste");
`);

// Expor funções globalmente
window.testSendMessage = testSendMessage;
window.testReceiveMessage = testReceiveMessage;