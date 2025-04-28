import React, { useEffect, useState } from 'react';
import apiService from '../services/api';
import { socketService } from '../services/socket'; // Corrigido: importação com chaves

const TestFinanceiroAPI = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [setores, setSetores] = useState([]);
  const [conversas, setConversas] = useState([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [testMode, setTestMode] = useState(false);

  // Executar testes de API e WebSocket
  useEffect(() => {
    const runTests = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log("🧪 Iniciando testes do setor Financeiro...");
        
        // 1. Testar conexão com a API
        console.log("📡 Testando API - Buscar setores");
        const setoresResult = await apiService.getSetores();
        console.log("Resposta de setores:", setoresResult);
        
        if (setoresResult.success) {
          setSetores(setoresResult.data);
          
          // Verificar se o setor Financeiro existe
          const financeiroSetor = setoresResult.data.find(
            setor => setor.nome === 'Financeiro'
          );
          
          if (financeiroSetor) {
            console.log("✅ Setor Financeiro encontrado:", financeiroSetor);
            
            // 2. Testar busca de conversas do setor
            console.log("📡 Testando API - Buscar conversas do setor Financeiro");
            const conversasResult = await apiService.getConversas({
              setorId: financeiroSetor._id
            });
            console.log("Resposta de conversas:", conversasResult);
            
            if (conversasResult.success) {
              setConversas(conversasResult.data);
              console.log(`✅ ${conversasResult.data.length} conversas encontradas`);
            }
          } else {
            console.warn("⚠️ Setor Financeiro não encontrado na API");
            setError("Setor Financeiro não encontrado. Execute o script de configuração.");
          }
        } else {
          setError("Falha ao buscar setores");
        }
        
        // 3. Testar conexão WebSocket
        console.log("🔌 Testando conexão WebSocket");
        try {
          // Verificar se o socket já está inicializado
          if (!socketService.isConnected()) {
            // Obter o ID do usuário do localStorage
            const userId = localStorage.getItem('userId');
            if (userId) {
              // Conectar utilizando a nova API
              socketService.setupForUser(
                'https://multi.compracomsegurancaeconfianca.com',
                userId,
                'agent'
              );
            } else {
              throw new Error("ID do usuário não encontrado para conexão WebSocket");
            }
          }
          
          const connected = socketService.isConnected();
          setSocketConnected(connected);
          console.log(connected 
            ? "✅ WebSocket conectado com sucesso!" 
            : "❌ WebSocket não conectado"
          );
          
          if (connected) {
            console.log("📡 Inscrevendo no setor Financeiro via WebSocket");
            // Entrar na sala do setor Financeiro
            const setorId = financeiroSetor?._id || 'financeiro';
            socketService.joinRoom(`user_${localStorage.getItem('userId')}_setor_${setorId}`);
          }
        } catch (socketError) {
          console.error("❌ Erro ao conectar WebSocket:", socketError);
          setError(prev => prev ? `${prev}\nErro WebSocket: ${socketError.message}` : `Erro WebSocket: ${socketError.message}`);
        }
        
        setLoading(false);
      } catch (err) {
        console.error("❌ Erro nos testes:", err);
        setError(`Erro nos testes: ${err.message}`);
        setLoading(false);
      }
    };
    
    if (testMode) {
      runTests();
    }
    
    return () => {
      // Limpar socket ao desmontar
      if (socketService.isConnected()) {
        socketService.disconnect();
      }
    };
  }, [testMode]);

  // Renderizar componente
  return (
    <div className="test-api-container p-4 m-4 bg-gray-800 rounded-lg text-white">
      <h2 className="text-xl font-semibold mb-4">Teste de API - Setor Financeiro</h2>
      
      {!testMode ? (
        <button 
          className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 mb-4"
          onClick={() => setTestMode(true)}
        >
          Iniciar Testes
        </button>
      ) : loading ? (
        <div className="test-loading p-4 bg-gray-700 rounded">
          <p>Executando testes...</p>
        </div>
      ) : (
        <div className="test-results">
          {error && (
            <div className="test-error p-4 bg-red-700 rounded mb-4">
              <h3 className="font-semibold">Erros encontrados:</h3>
              <pre className="mt-2 text-sm">{error}</pre>
            </div>
          )}
          
          <div className={`test-api-status p-3 rounded mb-4 ${setores.length > 0 ? 'bg-green-700' : 'bg-red-700'}`}>
            <h3 className="font-semibold">Status da API:</h3>
            <p>{setores.length > 0 ? '✅ Conectado e funcionando' : '❌ Problemas na conexão'}</p>
          </div>
          
          <div className={`test-socket-status p-3 rounded mb-4 ${socketConnected ? 'bg-green-700' : 'bg-red-700'}`}>
            <h3 className="font-semibold">Status do WebSocket:</h3>
            <p>{socketConnected ? '✅ Conectado' : '❌ Desconectado'}</p>
          </div>
          
          <div className="setores-section p-3 bg-gray-700 rounded mb-4">
            <h3 className="font-semibold mb-2">Setores encontrados ({setores.length}):</h3>
            {setores.length === 0 ? (
              <p>Nenhum setor encontrado</p>
            ) : (
              <ul className="list-disc pl-5">
                {setores.map(setor => (
                  <li key={setor._id} className={setor.nome === 'Financeiro' ? 'text-green-400' : ''}>
                    {setor.nome} {setor.nome === 'Financeiro' && '✅'}
                  </li>
                ))}
              </ul>
            )}
          </div>
          
          <div className="conversas-section p-3 bg-gray-700 rounded">
            <h3 className="font-semibold mb-2">Conversas do Financeiro ({conversas.length}):</h3>
            {conversas.length === 0 ? (
              <p>Nenhuma conversa encontrada</p>
            ) : (
              <ul className="list-disc pl-5">
                {conversas.map(conversa => (
                  <li key={conversa._id} className="mb-1">
                    {conversa.cliente?.nome || 'Cliente'} - {conversa.ultimaMensagem || 'Sem mensagens'}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TestFinanceiroAPI;