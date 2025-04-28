/**
 * Utilitário para testar a integração com a API MultiFlow
 * Este arquivo pode ser utilizado para depuração durante o desenvolvimento
 */

import apiService from '../services/api';
import socketService from '../services/socket';
import { STATUS } from '../config/constants';

// Teste de API
export const testApiConnection = async () => {
  console.log('Testando conexão com a API MultiFlow...');
  
  try {
    // Testar listagem de setores
    console.log('Testando listagem de setores...');
    const setoresResponse = await apiService.getSetores();
    console.log('Resposta de setores:', setoresResponse);
    
    if (setoresResponse.success) {
      console.log('✅ API de setores funcionando corretamente');
    } else {
      console.error('❌ Erro na API de setores:', setoresResponse);
    }
    
    // Testar listagem de conversas
    console.log('Testando listagem de conversas...');
    const conversasResponse = await apiService.getConversas({
      status: [STATUS.AGUARDANDO, STATUS.EM_ANDAMENTO],
      page: 1,
      limit: 10
    });
    console.log('Resposta de conversas:', conversasResponse);
    
    if (conversasResponse.success) {
      console.log('✅ API de conversas funcionando corretamente');
    } else {
      console.error('❌ Erro na API de conversas:', conversasResponse);
    }
    
    return {
      success: true,
      setores: setoresResponse,
      conversas: conversasResponse
    };
  } catch (error) {
    console.error('❌ Erro ao testar API:', error);
    return {
      success: false,
      error: error.message || 'Erro desconhecido'
    };
  }
};

// Teste de WebSocket
export const testSocketConnection = async () => {
  console.log('Testando conexão com WebSocket MultiFlow...');
  
  try {
    // Desconectar qualquer instância prévia
    if (socketService.isConnected()) {
      socketService.disconnect();
    }
    
    // Conectar ao WebSocket
    await socketService.connect();
    
    if (socketService.isConnected()) {
      console.log('✅ WebSocket conectado com sucesso');
      
      // Entrar na sala global do usuário
      const userId = localStorage.getItem('userId') || 'test-user';
      socketService.joinRoom(`user_${userId}`);
      
      // Definir um listener temporário para o evento de nova conversa
      socketService.on('nova_conversa', (data) => {
        console.log('✅ Evento nova_conversa recebido:', data);
      });
      
      return {
        success: true,
        connected: true
      };
    } else {
      console.error('❌ WebSocket não conectou');
      return {
        success: false,
        connected: false,
        error: 'Não foi possível estabelecer conexão WebSocket'
      };
    }
  } catch (error) {
    console.error('❌ Erro ao testar WebSocket:', error);
    return {
      success: false,
      error: error.message || 'Erro desconhecido'
    };
  }
};

/**
 * Para usar estes testes, importe e chame as funções em um componente:
 * 
 * import { testApiConnection, testSocketConnection } from '../utils/apiTests';
 * 
 * // Em algum evento ou useEffect:
 * testApiConnection().then(result => console.log('Resultado API:', result));
 * testSocketConnection().then(result => console.log('Resultado Socket:', result));
 */