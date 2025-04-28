import React, { useEffect, useState, useCallback } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase/config';
import { useSocketContext } from '../hooks/useSocketContext';
import { useAuthContext } from '../hooks/useAuthContext';

// Componente para mostrar as conversas do setor Financeiro
const SetorFinanceiro = () => {
  const [conversas, setConversas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedConversaId, setSelectedConversaId] = useState(null);
  const [listenerActive, setListenerActive] = useState(false);
  
  // Usar o contexto de socket correto
  const { isConnected, connectionError, selectConversation, reconnectSocket } = useSocketContext();
  const { user } = useAuthContext();

  // Buscar conversas do setor financeiro quando o componente montar
  useEffect(() => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      console.log("Buscando conversas do setor Financeiro...");
      
      // Criar query para o Firestore
      const q = query(
        collection(db, 'conversas'),
        where('setor', '==', 'Financeiro')
      );
      
      // Configurar listener em tempo real
      const unsubscribe = onSnapshot(
        q, 
        (querySnapshot) => {
          const conversasArray = [];
          querySnapshot.forEach((doc) => {
            conversasArray.push({
              id: doc.id,
              ...doc.data()
            });
          });
          
          setConversas(conversasArray);
          setLoading(false);
          setListenerActive(true);
          console.log(`${conversasArray.length} conversas encontradas no setor Financeiro`);
        },
        (err) => {
          console.error("Erro ao buscar conversas:", err);
          setError(`Erro ao buscar conversas: ${err.message}`);
          setLoading(false);
          setListenerActive(false);
        }
      );
      
      // Limpar listener ao desmontar
      return () => {
        unsubscribe();
        setListenerActive(false);
      };
    } catch (err) {
      console.error("Erro ao configurar listener:", err);
      setError(`Erro ao configurar busca: ${err.message}`);
      setLoading(false);
      setListenerActive(false);
    }
  }, [user]);
  
  // Função para reconectar o socket quando houver falha
  const handleReconnect = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const reconnected = await reconnectSocket();
      if (!reconnected) {
        setError("Não foi possível reconectar. Tente novamente mais tarde.");
      }
    } catch (err) {
      setError(`Erro ao reconectar: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }, [reconnectSocket]);
  
  // Função para selecionar uma conversa
  const handleSelectConversa = useCallback((conversaId) => {
    setSelectedConversaId(conversaId);
    if (selectConversation) {
      selectConversation(conversaId).catch(err => {
        console.error("Erro ao selecionar conversa:", err);
      });
    }
  }, [selectConversation]);
  
  // Renderizar estado de carregamento
  if (loading) {
    return (
      <div className="setor-financeiro-loading p-4 m-4 bg-gray-800 rounded-lg">
        <p className="text-white">Carregando conversas do setor Financeiro...</p>
        <div className="mt-2">
          <div className="animate-pulse bg-gray-700 h-2 w-full rounded"></div>
        </div>
      </div>
    );
  }
  
  // Renderizar estado de erro
  if (error) {
    return (
      <div className="setor-financeiro-error p-4 m-4 bg-red-800 rounded-lg">
        <p className="text-white">Erro: {error}</p>
        <div className="flex space-x-2 mt-3">
          <button 
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            onClick={() => window.location.reload()}
          >
            Recarregar página
          </button>
          
          <button 
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            onClick={handleReconnect}
          >
            Reconectar
          </button>
        </div>
      </div>
    );
  }
  
  // Renderizar lista de conversas
  return (
    <div className="setor-financeiro-container p-4 m-4 bg-gray-800 rounded-lg text-white">
      <h2 className="text-xl font-semibold mb-4">Setor Financeiro</h2>
      
      {/* Status da conexão */}
      <div className="setor-status mb-4">
        <div className="flex items-center justify-between">
          <span className={`status-indicator inline-block px-2 py-1 rounded ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}>
            {isConnected ? 'Conectado' : 'Desconectado'}
          </span>
          
          {!isConnected && (
            <button 
              className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600 text-sm"
              onClick={handleReconnect}
            >
              Reconectar
            </button>
          )}
        </div>
        
        {/* Exibir erro de conexão se houver */}
        {connectionError && (
          <div className="mt-2 p-2 bg-red-700 rounded text-sm">
            <p>Erro de conexão: {connectionError}</p>
          </div>
        )}
        
        {/* Status do listener */}
        <div className="mt-2 text-xs text-gray-400">
          <span className={`${listenerActive ? 'text-green-400' : 'text-red-400'}`}>
            Listener Firebase: {listenerActive ? 'Ativo' : 'Inativo'}
          </span>
        </div>
      </div>
      
      {conversas.length === 0 ? (
        <div className="no-conversations p-4 bg-gray-700 rounded">
          <p>Nenhuma conversa disponível no setor Financeiro.</p>
          <p className="text-sm mt-2 text-gray-400">
            Aguarde novas conversas ou verifique se o setor está configurado corretamente.
          </p>
        </div>
      ) : (
        <div className="conversations-list space-y-2">
          {conversas.map((conversa) => (
            <div 
              key={conversa.id}
              className={`conversation-item p-3 rounded cursor-pointer transition-colors ${selectedConversaId === conversa.id ? 'bg-green-700' : 'bg-gray-700 hover:bg-gray-600'}`}
              onClick={() => handleSelectConversa(conversa.id)}
            >
              <div className="conversation-header flex justify-between items-center mb-1">
                <h3 className="font-medium">{conversa.cliente?.nome || 'Cliente'}</h3>
                <span className="status text-sm px-2 py-1 rounded bg-blue-500">
                  {conversa.status || 'Aguardando'}
                </span>
              </div>
              <div className="conversation-preview flex justify-between text-gray-300 text-sm">
                <p className="truncate max-w-xs">{conversa.ultimaMensagem || 'Sem mensagens'}</p>
                <span className="time">
                  {conversa.ultimaAtividade ? new Date(conversa.ultimaAtividade.seconds * 1000).toLocaleTimeString() : ''}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SetorFinanceiro;