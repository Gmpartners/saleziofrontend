/**
 * Utilitário para executar testes de API e WebSocket
 */
import { testApiConnection, testSocketConnection } from './apiTests';

const runAllTests = async () => {
  console.group('🧪 INICIANDO TESTES DE INTEGRAÇÃO');
  
  // Testar conexão com a API
  console.group('📡 Teste da API');
  const apiResult = await testApiConnection();
  console.log('Resultado:', apiResult.success ? '✅ SUCESSO' : '❌ FALHA');
  console.groupEnd();
  
  // Testar conexão com o WebSocket
  console.group('🔌 Teste do WebSocket');
  const socketResult = await testSocketConnection();
  console.log('Resultado:', socketResult.success ? '✅ SUCESSO' : '❌ FALHA');
  console.groupEnd();
  
  console.groupEnd();
  
  return {
    api: apiResult,
    socket: socketResult,
    allPassed: apiResult.success && socketResult.success
  };
};

// Exportar função para uso em componentes
export default runAllTests;