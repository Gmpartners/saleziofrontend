import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { socketService } from '../services/socket';
import { multiflowApi } from '../services/multiflowApi';
import { useAuthContext } from '../hooks/useAuthContext';
import { API_ENDPOINTS } from '../config/syncConfig';

// Mapeamento de eventos da API MultiFlow
export const MultiFlowEventosMap = {
  NOVA_CONVERSA: 'nova_conversa',
  NOVA_MENSAGEM: 'nova_mensagem',
  CONVERSA_ATUALIZADA: 'conversa_atualizada'
};

// Mapeamento de status da API MultiFlow
export const MultiFlowStatusMap = {
  AGUARDANDO: 'aguardando',
  EM_ANDAMENTO: 'em_andamento',
  FINALIZADA: 'finalizada'
};

// Criar contexto para WebSocket
export const SocketContext = createContext(null);

// Hook para acessar o contexto
export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user, userProfile } = useAuthContext();
  const [isConnected, setIsConnected] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  
  // Usar uma ref para rastrear a conversa selecionada sem causar re-renders
  const selectedConversationIdRef = useRef(null);
  
  // URL do servidor WebSocket
  const socketURL = import.meta.env.VITE_SOCKET_URL || 'https://multi.compracomsegurancaeconfianca.com';

  // Verificar periodicamente o status da conexão
  useEffect(() => {
    // Função para verificar e atualizar o status
    const checkConnectionStatus = () => {
      const connected = socketService.isConnected();
      if (connected !== isConnected) {
        console.log(`Status da conexão alterado: ${connected ? 'Conectado' : 'Desconectado'}`);
        setIsConnected(connected);
      }
    };

    // Verificar imediatamente
    checkConnectionStatus();
    
    // Configurar verificação periódica
    const intervalId = setInterval(checkConnectionStatus, 3000);
    
    return () => clearInterval(intervalId);
  }, [isConnected]);

  // Configurar conexão e listeners do WebSocket
  useEffect(() => {
    if (!user || !userProfile) return;

    // Limpar qualquer estado de erro anterior
    setConnectionError(null);

    // Configurar socket com os dados do usuário
    try {
      console.log(`Inicializando socket para usuário: ${userProfile.id} com papel: ${userProfile.role}`);
      
      // Inicializar WebSocket com os dados do usuário
      socketService.setupForUser(socketURL, userProfile.id, userProfile.role, userProfile.setor);
      
      // Configurar listeners de evento
      const removeListeners = [
        // Evento de conexão
        socketService.on('connect', () => {
          console.log("Socket conectado com sucesso");
          setIsConnected(true);
          refreshConversations();
        }),
        
        // Evento de desconexão
        socketService.on('disconnect', () => {
          console.log("Socket desconectado");
          setIsConnected(false);
        }),
        
        // Nova conversa
        socketService.on(MultiFlowEventosMap.NOVA_CONVERSA, (data) => {
          console.log('Nova conversa:', data);
          // Adicionar nova conversa ao início da lista
          if (data.conversa) {
            setConversations(prev => [data.conversa, ...prev]);
          }
        }),
        
        // Nova mensagem
        socketService.on(MultiFlowEventosMap.NOVA_MENSAGEM, (data) => {
          console.log('Nova mensagem:', data);
          
          // Atualizar mensagens da conversa selecionada
          if (selectedConversationIdRef.current === data.conversaId) {
            setSelectedConversation(prev => {
              if (!prev) return null;
              
              return {
                ...prev,
                mensagens: [...(prev.mensagens || []), data.mensagem]
              };
            });
          }
          
          // Atualizar a lista de conversas
          setConversations(prev => 
            prev.map(conv => 
              conv._id === data.conversaId
                ? { 
                    ...conv, 
                    ultimaMensagem: data.mensagem.conteudo,
                    ultimaAtividade: data.mensagem.timestamp
                  }
                : conv
            )
          );
        }),
        
        // Conversa atualizada
        socketService.on(MultiFlowEventosMap.CONVERSA_ATUALIZADA, (data) => {
          console.log('Conversa atualizada:', data);
          
          // Atualizar a conversa na lista
          if (data.conversa) {
            setConversations(prev =>
              prev.map(conv =>
                conv._id === data.conversa._id ? data.conversa : conv
              )
            );
            
            // Atualizar a conversa selecionada se for a mesma
            if (selectedConversationIdRef.current === data.conversa._id) {
              setSelectedConversation(prev => ({
                ...prev,
                ...data.conversa
              }));
            }
          }
        })
      ];
      
      // Verificar conexão e atualizar estado
      setIsConnected(socketService.isConnected());
      
      // Carregar lista inicial de conversas
      refreshConversations();
      
      // Limpar ao desmontar
      return () => {
        removeListeners.forEach(removeListener => {
          if (typeof removeListener === 'function') {
            removeListener();
          }
        });
        
        // Desconectar o socket
        socketService.disconnect();
      };
    } catch (error) {
      console.error('Erro ao inicializar socket:', error);
      setConnectionError(`Falha ao conectar: ${error.message}`);
      
      // Carregar conversas usando a API REST como fallback
      refreshConversations();
      
      return () => {
        // Garantir que o socket seja desconectado se houver erro
        socketService.disconnect();
      };
    }
  }, [user, userProfile, socketURL]);

  // Atualizar a referência quando a conversa selecionada mudar
  useEffect(() => {
    if (selectedConversation) {
      selectedConversationIdRef.current = selectedConversation._id;
    } else {
      selectedConversationIdRef.current = null;
    }
  }, [selectedConversation]);

  // Selecionar uma conversa
  const selectConversation = useCallback(async (conversationId) => {
    try {
      // Buscar detalhes da conversa pela API
      const userId = userProfile?.id || user?.uid;
      const response = await multiflowApi.api.get(
        `/users/${userId}/conversas/${conversationId}`
      );
      
      if (response.data && response.data.success && response.data.data) {
        // Atualizar o estado com a conversa completa
        setSelectedConversation(response.data.data);
        
        // Entrar na sala específica da conversa para receber atualizações
        if (userId) {
          socketService.joinRoom(`user_${userId}_conversa_${conversationId}`);
        }
        
        // Atualizar status para em_andamento se estiver aguardando
        if (response.data.data.status === MultiFlowStatusMap.AGUARDANDO) {
          await multiflowApi.api.put(
            `/users/${userId}/conversas/${conversationId}/status`,
            { status: MultiFlowStatusMap.EM_ANDAMENTO }
          );
        }
        
        return response.data.data;
      } else {
        console.error('Erro ao obter detalhes da conversa:', response.data);
        return null;
      }
    } catch (error) {
      console.error('Erro ao selecionar conversa:', error);
      return null;
    }
  }, [user, userProfile]);

  // Enviar mensagem em uma conversa
  const sendMessage = useCallback(async (conversationId, text) => {
    try {
      const response = await multiflowApi.enviarMensagem(conversationId, text);
      console.log('Mensagem enviada:', response);
      return response.success;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      return false;
    }
  }, []);

  // Transferir conversa para outro setor
  const transferConversation = useCallback(async (conversationId, sectorId) => {
    try {
      const response = await multiflowApi.transferirConversa(conversationId, sectorId);
      
      // Se a transferência foi bem-sucedida
      if (response.success) {
        // Limpar a seleção se a conversa transferida era a selecionada
        if (selectedConversationIdRef.current === conversationId) {
          setSelectedConversation(null);
        }
        
        // Atualizar a lista de conversas
        setConversations(prev => 
          prev.map(conv => 
            conv._id === conversationId ? response.data : conv
          )
        );
      }
      
      return response.success;
    } catch (error) {
      console.error('Erro ao transferir conversa:', error);
      return false;
    }
  }, []);

  // Finalizar conversa
  const finishConversation = useCallback(async (conversationId) => {
    try {
      console.log(`Finalizando conversa ${conversationId}`);
      
      // Usar a implementação no serviço multiflowApi
      const response = await multiflowApi.finalizarConversa(conversationId);
      
      // Se a finalização foi bem-sucedida
      if (response && response.success) {
        console.log('Conversa finalizada com sucesso');
        
        // Limpar a seleção se a conversa finalizada era a selecionada
        if (selectedConversationIdRef.current === conversationId) {
          setSelectedConversation(null);
        }
        
        // Atualizar a lista de conversas, removendo a finalizada
        setConversations(prev => 
          prev.filter(conv => conv._id !== conversationId)
        );
        
        return true;
      } else {
        console.error('Erro ao finalizar conversa:', response);
        return false;
      }
    } catch (error) {
      console.error(`Erro ao finalizar conversa ${conversationId}:`, error);
      return false;
    }
  }, []);

  // Arquivar conversa
  const archiveConversation = useCallback(async (conversationId) => {
    try {
      console.log(`Arquivando conversa ${conversationId}`);
      
      // Usar a implementação no serviço multiflowApi
      const response = await multiflowApi.arquivarConversa(conversationId);
      
      // Se o arquivamento foi bem-sucedido
      if (response && response.success) {
        console.log('Conversa arquivada com sucesso');
        
        // Limpar a seleção se a conversa arquivada era a selecionada
        if (selectedConversationIdRef.current === conversationId) {
          setSelectedConversation(null);
        }
        
        // Atualizar a lista de conversas, removendo a arquivada
        setConversations(prev => 
          prev.filter(conv => conv._id !== conversationId)
        );
        
        return true;
      } else {
        console.error('Erro ao arquivar conversa:', response);
        return false;
      }
    } catch (error) {
      console.error(`Erro ao arquivar conversa ${conversationId}:`, error);
      return false;
    }
  }, []);

  // Atualizar lista de conversas
  const refreshConversations = useCallback(async (filters = {}) => {
    try {
      // Usar a API REST para buscar conversas
      const defaultFilters = {
        status: [MultiFlowStatusMap.AGUARDANDO, MultiFlowStatusMap.EM_ANDAMENTO],
        page: 1,
        limit: 20
      };
      
      // MODIFICAÇÃO: Não filtrar automaticamente pelo setor, mostrar todas as conversas
      // Apenas adicionar o setorId nos filtros se for explicitamente solicitado
      // if (userProfile?.setor && userProfile.role !== 'admin') {
      //   defaultFilters.setorId = userProfile.setor._id || userProfile.setor.id;
      // }
      
      // Mesclar filtros padrão com filtros fornecidos
      const mergedFilters = { ...defaultFilters, ...filters };
      
      console.log("Buscando conversas com filtros:", mergedFilters);
      const response = await multiflowApi.getConversas(mergedFilters);
      
      if (response.success && Array.isArray(response.data)) {
        console.log("Conversas obtidas:", response.data);
        setConversations(response.data);
      } else {
        console.warn('Falha ao buscar conversas:', response);
        // Mesmo sem sucesso, tente manter as conversas já carregadas
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          setConversations(response.data);
        }
      }
      
      return response.success;
    } catch (error) {
      console.error('Erro ao atualizar conversas:', error);
      return false;
    }
  }, [userProfile]);

  // Valores expostos pelo contexto
  const value = {
    isConnected,
    connectionError,
    conversations,
    selectedConversation,
    selectConversation,
    sendMessage,
    transferConversation,
    finishConversation,   // Adicionando a função ao contexto
    archiveConversation,  // Adicionando a função ao contexto
    refreshConversations,
    // Referências para a API e serviço de socket
    api: multiflowApi,
    socketService
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};