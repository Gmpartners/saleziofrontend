/**
 * Utilitário para testar o funcionamento do chat em tempo real
 */

/**
 * Testa se uma mensagem enviada pelo contexto está sendo atualizada corretamente na interface
 * Use no console do navegador: testSendMessage('Mensagem de teste')
 */
export function testSendMessage(message = 'Mensagem de teste enviada') {
  try {
    // Obter referência para o contexto
    const socketContext = document.querySelector('[data-socket-context]')?.__reactFiber$?.memoizedProps?.value;
    
    if (!socketContext || !socketContext.selectedConversation) {
      console.error('Nenhuma conversa selecionada ou contexto não encontrado');
      return false;
    }
    
    const conversationId = socketContext.selectedConversation._id;
    
    console.log(`Testando envio de mensagem para conversa ${conversationId}`);
    socketContext.sendMessage(conversationId, message);
    
    return true;
  } catch (error) {
    console.error('Erro ao testar envio de mensagem:', error);
    return false;
  }
}

/**
 * Testa se uma mensagem recebida está sendo atualizada corretamente na interface
 * Use no console do navegador: testReceiveMessage('Mensagem de teste recebida')
 */
export function testReceiveMessage(message = 'Mensagem de teste recebida') {
  try {
    // Obter referência para o contexto
    const socketContext = document.querySelector('[data-socket-context]')?.__reactFiber$?.memoizedProps?.value;
    
    if (!socketContext || !socketContext.selectedConversation) {
      console.error('Nenhuma conversa selecionada ou contexto não encontrado');
      return false;
    }
    
    const conversationId = socketContext.selectedConversation._id;
    
    console.log(`Testando recebimento de mensagem para conversa ${conversationId}`);
    
    // Se existe a função de teste no contexto, usá-la
    if (typeof socketContext.testReceiveMessage === 'function') {
      socketContext.testReceiveMessage(conversationId, message);
      return true;
    }
    
    // Fallback: usar o serviço de socket diretamente
    if (socketContext.socketService) {
      socketContext.socketService.simulateNewMessage(conversationId, message);
      return true;
    }
    
    console.error('Não foi possível simular o recebimento de mensagem');
    return false;
  } catch (error) {
    console.error('Erro ao testar recebimento de mensagem:', error);
    return false;
  }
}

/**
 * Verifica o estado atual de sincronização
 * Use no console do navegador: checkChatSyncStatus()
 */
export function checkChatSyncStatus() {
  try {
    // Obter referência para o contexto
    const socketContext = document.querySelector('[data-socket-context]')?.__reactFiber$?.memoizedProps?.value;
    
    if (!socketContext) {
      console.error('Contexto não encontrado');
      return { status: 'error', message: 'Contexto não encontrado' };
    }
    
    return {
      status: 'success',
      isConnected: socketContext.isConnected,
      connectionError: socketContext.connectionError,
      selectedConversation: socketContext.selectedConversation?._id,
      conversationsCount: socketContext.conversations?.length || 0,
      hasUnreadMessages: socketContext.hasUnreadMessages,
      isLoading: socketContext.isLoading
    };
  } catch (error) {
    console.error('Erro ao verificar status de sincronização:', error);
    return { status: 'error', message: error.message };
  }
}

// Expor funções globalmente para facilitar o uso no console do navegador
window.testSendMessage = testSendMessage;
window.testReceiveMessage = testReceiveMessage;
window.checkChatSyncStatus = checkChatSyncStatus;