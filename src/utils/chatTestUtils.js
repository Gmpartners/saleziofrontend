/**
 * Utilitários para testar funcionalidades de chat em tempo real
 */

// Função para enviar uma mensagem de teste
export const testSendMessage = (text = "Mensagem de teste enviada") => {
  try {
    // Verificar se há uma conversa selecionada
    const conversationDetail = document.getElementById('conversation-detail');
    
    if (!conversationDetail) {
      console.error('❌ Nenhuma conversa selecionada! Selecione uma conversa primeiro.');
      return false;
    }
    
    // Tentar obter o campo de input
    const input = conversationDetail.querySelector('input[type="text"]');
    if (!input) {
      console.error('❌ Campo de input não encontrado!');
      return false;
    }
    
    // Simular digitação no campo
    const originalValue = input.value;
    input.value = text;
    
    // Disparar evento de change para notificar React
    const event = new Event('change', { bubbles: true });
    input.dispatchEvent(event);
    
    // Encontrar botão de envio e clicar
    const submitButton = conversationDetail.querySelector('button[type="submit"]');
    if (submitButton) {
      submitButton.click();
      console.log('✅ Mensagem de teste enviada: ' + text);
      return true;
    } else {
      console.error('❌ Botão de envio não encontrado!');
      // Restaurar valor original
      input.value = originalValue;
      return false;
    }
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem de teste:', error);
    return false;
  }
};

// Função para receber uma mensagem de teste
export const testReceiveMessage = (text = "Mensagem de teste recebida") => {
  try {
    // Verificar se existe a função de teste no componente de conversa
    if (window.testChatMessage) {
      const result = window.testChatMessage(text);
      console.log('✅ Teste de recebimento de mensagem disparado');
      return result;
    }
    
    // Fallback: Verificar se podemos acessar o contexto de socket diretamente
    if (window.socketContext && window.socketContext.testReceiveMessage) {
      const conversationId = window.socketContext.selectedConversation?._id;
      if (!conversationId) {
        console.error('❌ Nenhuma conversa selecionada! Selecione uma conversa primeiro.');
        return false;
      }
      
      const result = window.socketContext.testReceiveMessage(conversationId, text);
      console.log('✅ Teste de recebimento de mensagem disparado via contexto');
      return result;
    }
    
    console.error('❌ Função de teste não encontrada! Está em uma conversa?');
    return false;
  } catch (error) {
    console.error('❌ Erro ao simular recebimento de mensagem:', error);
    return false;
  }
};

// Verificar status da sincronização do chat
export const checkChatSyncStatus = () => {
  console.group('📊 Status da sincronização do chat');
  
  // Verificar conexão do socket
  try {
    const isSocketConnected = window.socketService && window.socketService.isConnected();
    console.log(`Socket conectado: ${isSocketConnected ? '✅ Sim' : '❌ Não'}`);
  } catch (e) {
    console.log('Socket conectado: ❓ Não foi possível verificar');
  }
  
  // Verificar listeners de mensagens
  try {
    const hasListeners = window.socketService && 
                         window.socketService.eventListeners && 
                         window.socketService.eventListeners['nova_mensagem'] &&
                         window.socketService.eventListeners['nova_mensagem'].length > 0;
    
    console.log(`Listeners de mensagens: ${hasListeners ? '✅ Configurados (' + window.socketService.eventListeners['nova_mensagem'].length + ')' : '❌ Não configurados'}`);
  } catch (e) {
    console.log('Listeners de mensagens: ❓ Não foi possível verificar');
  }
  
  // Verificar conversa selecionada
  try {
    const conversationDetail = document.getElementById('conversation-detail');
    const isConversationSelected = conversationDetail !== null;
    console.log(`Conversa selecionada: ${isConversationSelected ? '✅ Sim' : '❌ Não'}`);
  } catch (e) {
    console.log('Conversa selecionada: ❓ Não foi possível verificar');
  }
  
  console.groupEnd();
  
  return {
    isReady: true,
    testSendMessage,
    testReceiveMessage
  };
};

// Registrar funções no escopo global para testes no console
window.testSendMessage = testSendMessage;
window.testReceiveMessage = testReceiveMessage;
window.checkChatSyncStatus = checkChatSyncStatus;
