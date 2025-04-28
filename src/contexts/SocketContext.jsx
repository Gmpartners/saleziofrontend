import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo, useReducer } from 'react';
import { realtimeService } from '../services/realtimeService';
import { multiflowApi } from '../services/multiflowApi';
import { notificationService } from '../services/notificationService';
import { offlineCacheService } from '../services/offlineCacheService';
import { useAuthContext } from '../hooks/useAuthContext';

export const MultiFlowEventosMap = {
  NOVA_CONVERSA: 'nova_conversa',
  NOVA_MENSAGEM: 'nova_mensagem',
  CONVERSA_ATUALIZADA: 'conversa_atualizada',
  DIGITANDO: 'typing',
  MENSAGEM_LIDA: 'message_read'
};

export const MultiFlowStatusMap = {
  AGUARDANDO: 'aguardando',
  EM_ANDAMENTO: 'em_andamento',
  FINALIZADA: 'finalizada'
};

export const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

const globalState = {
  isInitialized: false,
  lastConversationUpdate: {},
  manualRefreshInProgress: false
};

function conversationsReducer(state, action) {
  switch (action.type) {
    case 'INITIALIZE':
      return action.payload;
    case 'ADD_CONVERSATION':
      if (state.some(c => c._id === action.payload._id)) {
        return state;
      }
      return [action.payload, ...state].sort((a, b) => {
        const aTime = new Date(a.ultimaAtividade || a.criadoEm || 0).getTime();
        const bTime = new Date(b.ultimaAtividade || b.criadoEm || 0).getTime();
        return bTime - aTime;
      });
    case 'UPDATE_CONVERSATION':
      return state.map(conv => 
        conv._id === action.payload._id ? { ...conv, ...action.payload } : conv
      ).sort((a, b) => {
        const aTime = new Date(a.ultimaAtividade || a.criadoEm || 0).getTime();
        const bTime = new Date(b.ultimaAtividade || b.criadoEm || 0).getTime();
        return bTime - aTime;
      });
    case 'UPDATE_LAST_MESSAGE':
      return state.map(conv => {
        if (conv._id === action.payload.conversaId) {
          return {
            ...conv,
            ultimaMensagem: action.payload.content,
            ultimaAtividade: action.payload.timestamp,
            unreadCount: action.payload.incrementUnread ? (conv.unreadCount || 0) + 1 : conv.unreadCount || 0,
            lastMessageRead: action.payload.isRead
          };
        }
        return conv;
      }).sort((a, b) => {
        const aTime = new Date(a.ultimaAtividade || a.criadoEm || 0).getTime();
        const bTime = new Date(b.ultimaAtividade || b.criadoEm || 0).getTime();
        return bTime - aTime;
      });
    case 'MARK_AS_READ':
      return state.map(conv => 
        conv._id === action.payload ? { ...conv, unreadCount: 0, lastMessageRead: true } : conv
      );
    case 'REMOVE_CONVERSATION':
      return state.filter(conv => conv._id !== action.payload);
    case 'SORT_CONVERSATIONS':
      return [...state].sort((a, b) => {
        const aTime = new Date(a.ultimaAtividade || a.criadoEm || 0).getTime();
        const bTime = new Date(b.ultimaAtividade || b.criadoEm || 0).getTime();
        return bTime - aTime;
      });
    default:
      return state;
  }
}

function selectedConversationReducer(state, action) {
  switch (action.type) {
    case 'SET_CONVERSATION':
      return action.payload;
    case 'ADD_MESSAGE':
      if (!state) return null;
      
      const messageExists = state.mensagens && state.mensagens.some(msg => 
        msg._id === action.payload._id || 
        (action.payload.tempId && msg._id === action.payload.tempId)
      );
      
      if (messageExists) return state;
      
      return {
        ...state,
        mensagens: [...(state.mensagens || []), action.payload],
        ultimaAtividade: action.payload.timestamp || new Date().toISOString(),
        ultimaMensagem: action.payload.conteudo
      };
    case 'UPDATE_MESSAGE_STATUS':
      if (!state) return null;
      
      return {
        ...state,
        mensagens: state.mensagens.map(msg => 
          (msg._id === action.payload.id || msg._id === action.payload.tempId) 
            ? { ...msg, ...action.payload.updates } 
            : msg
        )
      };
    case 'UPDATE_READ_STATUS':
      if (!state) return null;
      
      return {
        ...state,
        mensagens: state.mensagens.map(msg => 
          action.payload.messageIds 
            ? (action.payload.messageIds.includes(msg._id) ? { ...msg, lida: true } : msg)
            : { ...msg, lida: true }
        )
      };
    case 'MERGE_MESSAGES':
      if (!state) return null;
      
      const existingIds = new Set(state.mensagens.map(m => m._id));
      const newMessages = action.payload.mensagens.filter(m => !existingIds.has(m._id));
      
      if (newMessages.length === 0) return state;
      
      return {
        ...state,
        ...action.payload,
        mensagens: [...state.mensagens, ...newMessages].sort((a, b) => {
          const aTime = new Date(a.timestamp || 0).getTime();
          const bTime = new Date(b.timestamp || 0).getTime();
          return aTime - bTime;
        })
      };
    default:
      return state;
  }
}

export const SocketProvider = ({ children }) => {
  const { user, userProfile } = useAuthContext();
  const [isConnected, setIsConnected] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [conversations, dispatchConversations] = useReducer(conversationsReducer, []);
  const [selectedConversation, dispatchSelectedConversation] = useReducer(selectedConversationReducer, null);
  const [completedConversations, setCompletedConversations] = useState([]);
  const [connectionError, setConnectionError] = useState(null);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  
  const selectedConversationIdRef = useRef(null);
  const appFocusedRef = useRef(document.hasFocus());
  const lastUpdateTimestampRef = useRef(Date.now());
  const isRefreshingRef = useRef(false);
  const shouldRefreshRef = useRef(false);
  const isRefreshingCompletedRef = useRef(false);
  const optimisticMessagesRef = useRef(new Map());
  const debounceTypingRef = useRef(null);
  const processedMessagesRef = useRef(new Map());
  const messageBatchRef = useRef([]);
  const highPriorityMessageBufferRef = useRef([]);
  const processMessageBatchTimeoutRef = useRef(null);
  const syncInProgressRef = useRef(false);
  const socketInitializedRef = useRef(false);
  const eventThrottleTimersRef = useRef({});
  const messageSequenceRef = useRef(0);
  const isMountedRef = useRef(true);
  
  const socketURL = import.meta.env.VITE_SOCKET_URL || 'https://multi.compracomsegurancaeconfianca.com';

  const refreshConversations = useCallback(async (filters = {}) => {
    if (isRefreshingRef.current) {
      console.log('Já existe uma atualização em andamento, ignorando');
      return false;
    }
    
    isRefreshingRef.current = true;
    setIsLoading(true);
    console.log('Atualizando lista de conversas com filtros:', filters);
    
    try {
      if (!navigator.onLine) {
        console.log('Dispositivo offline, carregando conversas do cache local');
        
        const cachedConversations = await offlineCacheService.getConversations(50);
        
        if (cachedConversations && cachedConversations.length > 0) {
          console.log(`Carregadas ${cachedConversations.length} conversas do cache local`);
          
          dispatchConversations({
            type: 'INITIALIZE',
            payload: cachedConversations
          });
          
          return {
            success: true,
            data: cachedConversations,
            fromCache: true
          };
        }
        
        return {
          success: false,
          error: 'Sem conexão e sem dados em cache',
          data: []
        };
      }
    
      const defaultFilters = {
        status: [MultiFlowStatusMap.AGUARDANDO, MultiFlowStatusMap.EM_ANDAMENTO],
        page: 1,
        limit: 50
      };
      
      const mergedFilters = { ...defaultFilters, ...filters };
      
      const response = await multiflowApi.getConversas(mergedFilters);
      
      if (response.success && Array.isArray(response.data)) {
        console.log("Conversas obtidas:", response.data.length);
        
        lastUpdateTimestampRef.current = Date.now();
        
        const conversasComStatus = response.data.map(conversa => {
          const existingConv = conversations.find(c => c._id === conversa._id);
          return {
            ...conversa,
            unreadCount: existingConv?.unreadCount || 0,
            lastMessageRead: existingConv?.lastMessageRead !== undefined ? existingConv.lastMessageRead : true
          };
        });
        
        offlineCacheService.saveConversations(conversasComStatus)
          .then(() => console.log('Conversas salvas no cache offline'))
          .catch(err => console.error('Erro ao salvar conversas no cache:', err));
        
        if (conversations.length > 0 && conversasComStatus.length > 0) {
          dispatchConversations({
            type: 'INITIALIZE',
            payload: conversasComStatus
          });
        } else {
          dispatchConversations({
            type: 'INITIALIZE',
            payload: conversasComStatus
          });
        }
        
        notificationService.showToast('Conversas atualizadas', 'success');
      } else {
        console.warn('Falha ao buscar conversas:', response);
        
        const cachedConversations = await offlineCacheService.getConversations(50);
        
        if (cachedConversations && cachedConversations.length > 0) {
          console.log(`Usando ${cachedConversations.length} conversas do cache como fallback`);
          
          dispatchConversations({
            type: 'INITIALIZE',
            payload: cachedConversations
          });
        }
        
        if (!response.success) {
          notificationService.notifyError({
            message: 'Erro ao atualizar conversas. Tente novamente manualmente.'
          });
        }
      }
      
      return response;
    } catch (error) {
      console.error('Erro ao atualizar conversas:', error);
      
      try {
        const cachedConversations = await offlineCacheService.getConversations(50);
        
        if (cachedConversations && cachedConversations.length > 0) {
          console.log(`Erro de API, usando ${cachedConversations.length} conversas do cache`);
          
          dispatchConversations({
            type: 'INITIALIZE',
            payload: cachedConversations
          });
        }
      } catch (cacheError) {
        console.error('Erro ao acessar cache:', cacheError);
      }
      
      notificationService.notifyError({
        message: 'Erro ao atualizar conversas. Tente novamente manualmente.'
      });
      
      return {
        success: false,
        error: error.message
      };
    } finally {
      setTimeout(() => {
        isRefreshingRef.current = false;
        setIsLoading(false);
      }, 1000);
    }
  }, [conversations]);

  const triggerRefresh = useCallback(() => {
    if (shouldRefreshRef.current && !isRefreshingRef.current) {
      console.log('Disparando atualização de conversas...');
      shouldRefreshRef.current = false;
      refreshConversations();
    }
  }, [refreshConversations]);

  const markMessageAsRead = useCallback((conversationId, messageId) => {
    if (!conversationId || !messageId || !userProfile) return;
    
    try {
      if (!navigator.onLine) {
        if (selectedConversationIdRef.current === conversationId) {
          dispatchSelectedConversation({
            type: 'UPDATE_READ_STATUS',
            payload: { messageIds: [messageId] }
          });
        }
        return;
      }
      
      multiflowApi.api.post(`/users/${userProfile.id}/conversas/${conversationId}/mensagens/${messageId}/read`)
        .then(() => {
          realtimeService.markMessagesAsRead(conversationId, [messageId]);
        })
        .catch(error => {
          console.error('Erro ao marcar mensagem como lida:', error);
        });
    } catch (error) {
      console.error('Erro ao marcar mensagem como lida:', error);
    }
  }, [userProfile]);

  const markMessagesAsRead = useCallback((conversationId) => {
    if (!conversationId || !selectedConversation || !userProfile) return;
    
    try {
      if (navigator.onLine) {
        multiflowApi.api.post(`/users/${userProfile.id}/conversas/${conversationId}/read`);
        
        realtimeService.markMessagesAsRead(conversationId);
      }
      
      dispatchConversations({
        type: 'MARK_AS_READ',
        payload: conversationId
      });
      
      if (selectedConversationIdRef.current === conversationId) {
        dispatchSelectedConversation({
          type: 'UPDATE_READ_STATUS',
          payload: {}
        });
      }
    } catch (error) {
      console.error('Erro ao marcar mensagens como lidas:', error);
    }
  }, [selectedConversation, userProfile]);

  const processMessageBatch = useCallback(() => {
    if (highPriorityMessageBufferRef.current.length > 0) {
      console.log(`Processando lote de ${highPriorityMessageBufferRef.current.length} mensagens de alta prioridade`);
      
      highPriorityMessageBufferRef.current.forEach(data => {
        const { conversaId, mensagem } = data;
        const isCurrentConversation = selectedConversationIdRef.current === conversaId;
        
        if (isCurrentConversation) {
          dispatchSelectedConversation({
            type: 'ADD_MESSAGE',
            payload: mensagem
          });
          
          if (appFocusedRef.current && mensagem._id) {
            markMessageAsRead(conversaId, mensagem._id);
          }
        }
        
        dispatchConversations({
          type: 'UPDATE_LAST_MESSAGE',
          payload: {
            conversaId,
            content: mensagem.conteudo,
            timestamp: mensagem.timestamp || new Date().toISOString(),
            incrementUnread: !isCurrentConversation || !appFocusedRef.current,
            isRead: isCurrentConversation && appFocusedRef.current
          }
        });
        
        offlineCacheService.saveMessage(mensagem, conversaId)
          .catch(err => console.error('Erro ao salvar mensagem de alta prioridade no cache:', err));
      });
      
      highPriorityMessageBufferRef.current = [];
    }
    
    if (messageBatchRef.current.length === 0) {
      processMessageBatchTimeoutRef.current = null;
      return;
    }
    
    console.log(`Processando lote de ${messageBatchRef.current.length} mensagens`);
    
    const messagesByConversation = {};
    
    messageBatchRef.current.forEach(data => {
      const { conversaId, mensagem } = data;
      if (!messagesByConversation[conversaId]) {
        messagesByConversation[conversaId] = [];
      }
      messagesByConversation[conversaId].push(mensagem);
    });
    
    Object.entries(messagesByConversation).forEach(([conversaId, mensagens]) => {
      const isCurrentConversation = selectedConversationIdRef.current === conversaId;
      
      mensagens.sort((a, b) => {
        const aTime = new Date(a.timestamp || 0).getTime();
        const bTime = new Date(b.timestamp || 0).getTime();
        return aTime - bTime;
      });
      
      if (isCurrentConversation) {
        const existingMessageIds = selectedConversation?.mensagens 
          ? new Set(selectedConversation.mensagens.map(m => m._id))
          : new Set();
          
        const newMessages = mensagens.filter(m => !existingMessageIds.has(m._id));
        
        if (newMessages.length > 0) {
          newMessages.forEach(msg => {
            dispatchSelectedConversation({
              type: 'ADD_MESSAGE',
              payload: msg
            });
          });
          
          const updatedConversation = {
            ...selectedConversation,
            mensagens: [...(selectedConversation?.mensagens || []), ...newMessages],
            ultimaAtividade: newMessages[newMessages.length - 1].timestamp || new Date().toISOString(),
            ultimaMensagem: newMessages[newMessages.length - 1].conteudo
          };
          
          offlineCacheService.saveConversation(updatedConversation)
            .catch(err => console.error('Erro ao salvar conversa no cache:', err));
          
          offlineCacheService.saveMessages(newMessages, conversaId)
            .catch(err => console.error('Erro ao salvar mensagens no cache:', err));
        }
        
        if (appFocusedRef.current) {
          mensagens.forEach(msg => {
            if (msg._id) markMessageAsRead(conversaId, msg._id);
          });
        }
      }
      
      const lastMessage = mensagens[mensagens.length - 1];
      
      dispatchConversations({
        type: 'UPDATE_LAST_MESSAGE',
        payload: {
          conversaId,
          content: lastMessage.conteudo,
          timestamp: lastMessage.timestamp || new Date().toISOString(),
          incrementUnread: !isCurrentConversation || !appFocusedRef.current,
          isRead: isCurrentConversation && appFocusedRef.current
        }
      });
      
      const conversationExists = conversations.some(c => c._id === conversaId);
      
      if (!conversationExists) {
        refreshConversations();
      }
    });
    
    messageBatchRef.current = [];
    processMessageBatchTimeoutRef.current = null;
  }, [conversations, markMessageAsRead, refreshConversations, selectedConversation]);

  const addMessageToProcessQueue = useCallback((data, highPriority = false) => {
    const { conversaId, mensagem } = data;
    
    const messageId = mensagem && mensagem._id ? mensagem._id : null;
    const timestamp = mensagem && mensagem.timestamp ? mensagem.timestamp : new Date().toISOString();
    const messageKey = `${conversaId}-${messageId || timestamp}-${mensagem?.conteudo?.slice(0, 20)}`;
    
    if (processedMessagesRef.current.has(messageKey)) {
      console.log('Mensagem duplicada ignorada:', messageKey);
      return false;
    }
    
    processedMessagesRef.current.set(messageKey, Date.now());
    
    if (processedMessagesRef.current.size > 1000) {
      const now = Date.now();
      const expiryTime = 5 * 60 * 1000;
      
      processedMessagesRef.current.forEach((timestamp, key) => {
        if (now - timestamp > expiryTime) {
          processedMessagesRef.current.delete(key);
        }
      });
    }
    
    const messageWithSequence = {
      ...mensagem,
      _sequence: messageSequenceRef.current++
    };
    
    if (highPriority) {
      highPriorityMessageBufferRef.current.push({
        conversaId,
        mensagem: messageWithSequence
      });
      
      processMessageBatch();
    } else {
      messageBatchRef.current.push({
        conversaId,
        mensagem: messageWithSequence
      });
      
      if (!processMessageBatchTimeoutRef.current) {
        processMessageBatchTimeoutRef.current = setTimeout(processMessageBatch, 50);
      }
    }
    
    return true;
  }, [processMessageBatch]);

  const syncPendingMessages = useCallback(async () => {
    if (syncInProgressRef.current || !isOnline || !user || !userProfile) {
      return;
    }
    
    syncInProgressRef.current = true;
    console.log('🔄 Sincronizando mensagens pendentes...');
    
    try {
      const pendingMessages = await offlineCacheService.getPendingMessages();
      
      if (pendingMessages.length === 0) {
        console.log('✅ Nenhuma mensagem pendente para sincronizar');
        syncInProgressRef.current = false;
        return;
      }
      
      console.log(`🔄 Sincronizando ${pendingMessages.length} mensagens pendentes`);
      
      const messagesByConversation = {};
      pendingMessages.forEach(message => {
        if (!messagesByConversation[message.conversaId]) {
          messagesByConversation[message.conversaId] = [];
        }
        messagesByConversation[message.conversaId].push(message);
      });
      
      for (const [conversaId, messages] of Object.entries(messagesByConversation)) {
        messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        for (const message of messages) {
          try {
            console.log(`🔄 Sincronizando mensagem pendente: ${message.tempId}`);
            
            const response = await multiflowApi.enviarMensagem(
              conversaId, 
              message.conteudo
            );
            
            if (response.success) {
              console.log(`✅ Mensagem pendente sincronizada com sucesso: ${message.tempId}`);
              
              if (selectedConversationIdRef.current === conversaId) {
                dispatchSelectedConversation({
                  type: 'UPDATE_MESSAGE_STATUS',
                  payload: {
                    id: message.tempId,
                    updates: {
                      _id: response.data?.mensagemId || message.tempId,
                      status: 'sent'
                    }
                  }
                });
              }
              
              await offlineCacheService.removePendingMessage(message.tempId);
            } else {
              console.error(`❌ Falha ao sincronizar mensagem pendente: ${message.tempId}`, response.error);
            }
          } catch (error) {
            console.error(`❌ Erro ao sincronizar mensagem pendente: ${message.tempId}`, error);
          }
        }
      }
    } catch (error) {
      console.error('❌ Erro ao sincronizar mensagens pendentes:', error);
    } finally {
      syncInProgressRef.current = false;
    }
  }, [isOnline, user, userProfile]);

  const forceRefreshCurrentConversation = useCallback(async () => {
    if (globalState.manualRefreshInProgress) {
      console.log('⚠️ Atualização já em andamento, ignorando chamada');
      return null;
    }
    
    if (!selectedConversationIdRef.current || !user || !userProfile) {
      console.log('⚠️ Sem conversa selecionada ou usuário não logado');
      return null;
    }
    
    const conversationId = selectedConversationIdRef.current;
    
    const now = Date.now();
    const lastUpdate = globalState.lastConversationUpdate[conversationId] || 0;
    if (now - lastUpdate < 10000) {
      console.log('⚠️ Conversa atualizada recentemente, ignorando');
      return selectedConversation;
    }
    
    globalState.manualRefreshInProgress = true;
    console.log('🔄 Forçando atualização da conversa atual:', conversationId);
    
    try {
      const userId = userProfile?.id || user?.uid;
      
      const response = await multiflowApi.api.get(
        `/users/${userId}/conversas/${conversationId}`
      );
      
      if (response.data && response.data.success && response.data.data) {
        console.log('📥 Detalhes atualizados da conversa recebidos do servidor');
        
        globalState.lastConversationUpdate[conversationId] = now;
        
        const updatedConversation = {
          ...response.data.data,
          mensagens: response.data.data.mensagens || [],
          unreadCount: 0,
          lastMessageRead: true
        };
        
        dispatchSelectedConversation({
          type: 'MERGE_MESSAGES',
          payload: updatedConversation
        });
        
        dispatchConversations({
          type: 'UPDATE_CONVERSATION',
          payload: {
            ...updatedConversation,
            unreadCount: 0,
            lastMessageRead: true
          }
        });
        
        return updatedConversation;
      }
      return null;
    } catch (error) {
      console.error('Erro ao atualizar conversa atual:', error);
      return null;
    } finally {
      globalState.manualRefreshInProgress = false;
    }
  }, [user, userProfile, selectedConversation]);

  useEffect(() => {
    const handleFocus = () => {
      console.log('Aplicação ganhou foco');
      appFocusedRef.current = true;
      
      const now = Date.now();
      if (now - lastUpdateTimestampRef.current > 300000) {
        shouldRefreshRef.current = true;
        triggerRefresh();
      }
      
      setHasUnreadMessages(false);
      
      document.title = document.title.split(' • ')[0] || 'Dashboard';
      
      if (selectedConversationIdRef.current) {
        markMessagesAsRead(selectedConversationIdRef.current);
      }
    };
    
    const handleBlur = () => {
      console.log('Aplicação perdeu foco');
      appFocusedRef.current = false;
    };
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    notificationService.preloadSounds();
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [markMessagesAsRead, triggerRefresh]);

  useEffect(() => {
    const handleOnline = () => {
      console.log('🌐 Conectado à rede');
      setIsOnline(true);
      
      syncPendingMessages();
    };
    
    const handleOffline = () => {
      console.log('🔌 Desconectado da rede');
      setIsOnline(false);
      
      notificationService.notifyWarning({
        message: 'Você está offline. As mensagens serão enviadas quando a conexão for restaurada.'
      });
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncPendingMessages]);

  useEffect(() => {
    const checkConnectionStatus = () => {
      const connected = realtimeService.isConnected();
      const connectionState = realtimeService.getConnectionState();
      
      if (connected !== isConnected) {
        console.log(`Status da conexão alterado: ${connected ? 'Conectado' : 'Desconectado'} (${connectionState})`);
        setIsConnected(connected);
        
        if (connected && !isConnected) {
          const now = Date.now();
          if (now - lastUpdateTimestampRef.current > 300000) {
            shouldRefreshRef.current = true;
            triggerRefresh();
          }
        }
      }
      
      if (connectionState === 'FAILED' && connectionError !== 'failed') {
        setConnectionError('failed');
        notificationService.notifyError({
          message: 'Não foi possível reconectar ao servidor. Tente recarregar a página.'
        });
      }
    };

    checkConnectionStatus();
    
    const removeConnectListener = realtimeService.on('connect', () => {
      checkConnectionStatus();
    });
    
    const removeDisconnectListener = realtimeService.on('disconnect', () => {
      checkConnectionStatus();
    });
    
    return () => {
      removeConnectListener();
      removeDisconnectListener();
    };
  }, [isConnected, connectionError, triggerRefresh]);

  useEffect(() => {
    if (!user || !userProfile) return;
    
    if (globalState.isInitialized || socketInitializedRef.current) {
      console.log('SocketContext já está inicializado. Ignorando.');
      return;
    }
    
    globalState.isInitialized = true;
    socketInitializedRef.current = true;
    console.log('Inicializando SocketContext...');

    setConnectionError(null);

    try {
      console.log(`Inicializando comunicação em tempo real para usuário: ${userProfile.id} com papel: ${userProfile.role}`);
      
      realtimeService.setupForUser(socketURL, userProfile.id, userProfile.role, userProfile.setor);
      
      realtimeService._setupHeartbeat();

      setIsConnected(realtimeService.isConnected());
      
      const removeListeners = [
        realtimeService.on('connect', () => {
          console.log("Socket conectado com sucesso");
          setIsConnected(true);
          setConnectionError(null);
          
          if (conversations.length === 0) {
            shouldRefreshRef.current = true;
            triggerRefresh();
          }
        }),
        
        realtimeService.on('disconnect', (reason) => {
          console.log("Socket desconectado:", reason);
          setIsConnected(false);
          
          if (reason !== 'io client disconnect' && connectionError !== 'disconnected') {
            setConnectionError('disconnected');
            notificationService.notifyError({
              message: 'Conexão perdida. Reconectando...'
            });
          }
        }),
        
        realtimeService.on('reconnect', (attempt) => {
          console.log(`Reconectado na tentativa ${attempt}`);
          setIsConnected(true);
          setConnectionError(null);
          
          refreshConversations();
        }),
        
        realtimeService.on('reconnect_failed', () => {
          console.log('Falha na reconexão após múltiplas tentativas');
          setConnectionError('failed');
          
          notificationService.notifyError({
            message: 'Não foi possível reconectar. Tente recarregar a página.'
          });
        }),
        
        realtimeService.on(MultiFlowEventosMap.NOVA_CONVERSA, (data) => {
          if (!isMountedRef.current) return;
          
          console.log('Nova conversa:', data);
          
          lastUpdateTimestampRef.current = Date.now();
          
          if (data.conversa) {
            const conversaWithUnreadCount = {
              ...data.conversa,
              unreadCount: 1,
              lastMessageRead: false
            };
            
            const existingConversation = conversations.find(c => c._id === data.conversa._id);
            
            if (!existingConversation) {
              dispatchConversations({
                type: 'ADD_CONVERSATION',
                payload: conversaWithUnreadCount
              });
              
              notificationService.notifyNewConversation(data.conversa);
              
              if (!appFocusedRef.current) {
                setHasUnreadMessages(true);
              }
            }
          }
        }),
        
        realtimeService.on(MultiFlowEventosMap.NOVA_MENSAGEM, (data) => {
          if (!isMountedRef.current) return;
          
          const messageAdded = addMessageToProcessQueue(data);
          
          if (messageAdded) {
            console.log('Nova mensagem processada:', data);
            
            lastUpdateTimestampRef.current = Date.now();
            
            globalState.lastConversationUpdate[data.conversaId] = Date.now();
            
            const isCurrentConversation = selectedConversationIdRef.current === data.conversaId;
            
            notificationService.notifyNewMessage(data.mensagem, isCurrentConversation);
            
            if (!appFocusedRef.current) {
              setHasUnreadMessages(true);
            }
            
            if (typingUsers[data.conversaId]) {
              setTypingUsers(prev => {
                const newState = {...prev};
                delete newState[data.conversaId];
                return newState;
              });
            }
            
            offlineCacheService.saveMessage(data.mensagem, data.conversaId)
              .catch(err => console.error('Erro ao salvar mensagem no cache:', err));
          }
        }),
        
        realtimeService.on(MultiFlowEventosMap.DIGITANDO, (data) => {
          if (!isMountedRef.current) return;
          
          if (data.userId === userProfile.id) return;
          
          const typingKey = `${data.conversaId}-${data.userId}`;
          
          if (!eventThrottleTimersRef.current[typingKey]) {
            setTypingUsers(prev => ({
              ...prev,
              [data.conversaId]: {
                userId: data.userId,
                nome: data.userName || 'Cliente',
                timestamp: Date.now()
              }
            }));
            
            eventThrottleTimersRef.current[typingKey] = setTimeout(() => {
              eventThrottleTimersRef.current[typingKey] = null;
            }, 1000);
          }
          
          clearTimeout(eventThrottleTimersRef.current[`${typingKey}-clear`]);
          eventThrottleTimersRef.current[`${typingKey}-clear`] = setTimeout(() => {
            setTypingUsers(prev => {
              if (prev[data.conversaId]?.userId === data.userId &&
                  Date.now() - prev[data.conversaId].timestamp > 2000) {
                const newState = {...prev};
                delete newState[data.conversaId];
                return newState;
              }
              return prev;
            });
            eventThrottleTimersRef.current[`${typingKey}-clear`] = null;
          }, 3000);
        }),
        
        realtimeService.on(MultiFlowEventosMap.CONVERSA_ATUALIZADA, (data) => {
          if (!isMountedRef.current) return;
          
          console.log('Conversa atualizada:', data);
          
          lastUpdateTimestampRef.current = Date.now();
          
          if (data.conversa && data.conversa._id) {
            globalState.lastConversationUpdate[data.conversa._id] = Date.now();
          }
          
          const isCurrentConversation = selectedConversationIdRef.current === data?.conversa?._id;
          
          if (data.conversa) {
            notificationService.notifyConversationUpdate(data.conversa, isCurrentConversation);
          }
          
          if (data.conversa) {
            if (data.conversa.status === MultiFlowStatusMap.FINALIZADA) {
              dispatchConversations({
                type: 'REMOVE_CONVERSATION',
                payload: data.conversa._id
              });
              
              setCompletedConversations(prev => {
                if (!prev.some(c => c._id === data.conversa._id)) {
                  return [data.conversa, ...prev];
                }
                return prev;
              });
              
              if (isCurrentConversation) {
                dispatchSelectedConversation({
                  type: 'SET_CONVERSATION',
                  payload: null
                });
                selectedConversationIdRef.current = null;
              }
            } else {
              const existingConv = conversations.find(c => c._id === data.conversa._id);
              const updatedConversation = {
                ...data.conversa,
                unreadCount: existingConv?.unreadCount || 0,
                lastMessageRead: existingConv?.lastMessageRead !== undefined 
                  ? existingConv.lastMessageRead 
                  : true
              };
              
              dispatchConversations({
                type: 'UPDATE_CONVERSATION',
                payload: updatedConversation
              });
              
              if (isCurrentConversation) {
                dispatchSelectedConversation({
                  type: 'MERGE_MESSAGES',
                  payload: data.conversa
                });
              }
            }
          }
        }),
        
        realtimeService.on(MultiFlowEventosMap.MENSAGEM_LIDA, (data) => {
          if (!isMountedRef.current) return;
          
          if (selectedConversation && selectedConversation._id === data.conversaId) {
            dispatchSelectedConversation({
              type: 'UPDATE_MESSAGE_STATUS',
              payload: {
                id: data.messageId,
                updates: { lida: true, readAt: data.timestamp }
              }
            });
          }
        }),
        
        realtimeService.on('error', (error) => {
          if (!isMountedRef.current) return;
          
          console.error('Erro no socket:', error);
          notificationService.notifyError({
            message: `Erro de conexão: ${error.message || 'Desconhecido'}`
          });
        })
      ];
      
      setIsConnected(realtimeService.isConnected());
      
      shouldRefreshRef.current = true;
      triggerRefresh();
      
      return () => {
        console.log('Desmontando SocketContext, limpando listeners e desconectando');
        isMountedRef.current = false;
        
        removeListeners.forEach(removeListener => {
          if (typeof removeListener === 'function') {
            removeListener();
          }
        });
        
        Object.keys(eventThrottleTimersRef.current).forEach(key => {
          clearTimeout(eventThrottleTimersRef.current[key]);
        });
        
        if (processMessageBatchTimeoutRef.current) {
          clearTimeout(processMessageBatchTimeoutRef.current);
        }
        
        realtimeService.disconnect();
        globalState.isInitialized = false;
        socketInitializedRef.current = false;
      };
    } catch (error) {
      console.error('Erro ao inicializar comunicação em tempo real:', error);
      setConnectionError(`Falha ao conectar: ${error.message}`);
      
      notificationService.notifyError({
        message: `Erro de conexão: ${error.message}`
      });
      
      shouldRefreshRef.current = true;
      triggerRefresh();
      
      return () => {
        isMountedRef.current = false;
        realtimeService.disconnect();
        globalState.isInitialized = false;
        socketInitializedRef.current = false;
      };
    }
  }, [user, userProfile, socketURL, triggerRefresh, conversations.length, refreshConversations, addMessageToProcessQueue]);

  useEffect(() => {
    if (selectedConversation) {
      selectedConversationIdRef.current = selectedConversation._id;
    } else {
      selectedConversationIdRef.current = null;
    }
  }, [selectedConversation]);

  useEffect(() => {
    isMountedRef.current = true;
    
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const selectConversation = useCallback(async (conversationId) => {
    console.log(`Selecionando conversa: ${conversationId}`);
    
    try {
      const userId = userProfile?.id || user?.uid;
      
      if (selectedConversationIdRef.current === conversationId && selectedConversation) {
        console.log('Já na conversa selecionada, verificando se precisa atualizar');
        
        const now = Date.now();
        const lastUpdate = globalState.lastConversationUpdate[conversationId] || 0;
        if (now - lastUpdate > 30000) {
          console.log('Conversa não atualizada recentemente, buscando dados do servidor');
          forceRefreshCurrentConversation();
        } else {
          console.log('Conversa atualizada recentemente, usando dados em cache');
        }
        
        markMessagesAsRead(conversationId);
        
        return selectedConversation;
      }
      
      const cachedConversation = conversations.find(conv => conv._id === conversationId) || 
                                completedConversations.find(conv => conv._id === conversationId);
      
      if (cachedConversation) {
        console.log('Usando versão em cache temporariamente enquanto carrega dados atualizados');
        dispatchSelectedConversation({
          type: 'SET_CONVERSATION', 
          payload: cachedConversation
        });
        selectedConversationIdRef.current = conversationId;
        
        if (cachedConversation.unreadCount > 0) {
          dispatchConversations({
            type: 'MARK_AS_READ',
            payload: conversationId
          });
        }
      }
      
      if (!cachedConversation) {
        setIsLoading(true);
      }
      
      if (!navigator.onLine) {
        console.log('Dispositivo offline, buscando conversa do cache local');
        
        const offlineConversation = await offlineCacheService.getConversation(conversationId);
        
        if (offlineConversation) {
          console.log('Conversa encontrada no cache offline');
          
          const offlineMessages = await offlineCacheService.getConversationMessages(conversationId);
          
          const completeOfflineConversation = {
            ...offlineConversation,
            mensagens: offlineMessages || [],
            unreadCount: 0,
            lastMessageRead: true,
            fromCache: true
          };
          
          dispatchSelectedConversation({
            type: 'SET_CONVERSATION',
            payload: completeOfflineConversation
          });
          selectedConversationIdRef.current = conversationId;
          
          setIsLoading(false);
          return completeOfflineConversation;
        }
        
        setIsLoading(false);
        
        notificationService.notifyWarning({
          message: 'Você está offline e esta conversa não está em cache. Algumas informações podem estar indisponíveis.'
        });
        
        return cachedConversation || null;
      }
      
      console.log('Buscando dados atualizados da conversa do servidor...');
      const response = await multiflowApi.api.get(`/users/${userId}/conversas/${conversationId}`);
      
      if (response.data && response.data.success && response.data.data) {
        console.log('Detalhes da conversa recebidos do servidor');
        
        const updatedConversation = {
          ...response.data.data,
          mensagens: response.data.data.mensagens || [],
          unreadCount: 0,
          lastMessageRead: true
        };
        
        dispatchSelectedConversation({
          type: 'SET_CONVERSATION',
          payload: updatedConversation
        });
        selectedConversationIdRef.current = conversationId;
        
        globalState.lastConversationUpdate[conversationId] = Date.now();
        
        await offlineCacheService.saveConversation(updatedConversation);
        
        if (updatedConversation.mensagens && updatedConversation.mensagens.length > 0) {
          await offlineCacheService.saveMessages(updatedConversation.mensagens, conversationId);
        }
        
        if (userId) {
          realtimeService.joinRoom(`user_${userId}_conversa_${conversationId}`);
        }
        
        markMessagesAsRead(conversationId);
        
        if (response.data.data.status === MultiFlowStatusMap.AGUARDANDO) {
          await multiflowApi.api.put(`/users/${userId}/conversas/${conversationId}/status`,
            { status: MultiFlowStatusMap.EM_ANDAMENTO }
          );
          
          dispatchSelectedConversation({
            type: 'MERGE_MESSAGES',
            payload: {
              ...updatedConversation,
              status: MultiFlowStatusMap.EM_ANDAMENTO
            }
          });
          
          dispatchConversations({
            type: 'UPDATE_CONVERSATION',
            payload: {
              _id: conversationId,
              status: MultiFlowStatusMap.EM_ANDAMENTO,
              unreadCount: 0,
              lastMessageRead: true
            }
          });
          
          const updatedCacheConv = {
            ...updatedConversation,
            status: MultiFlowStatusMap.EM_ANDAMENTO
          };
          await offlineCacheService.saveConversation(updatedCacheConv);
        }
        
        setIsLoading(false);
        return updatedConversation;
      } else {
        console.error('Erro ao obter detalhes da conversa:', response.data);
        
        try {
          const offlineConversation = await offlineCacheService.getConversation(conversationId);
          
          if (offlineConversation) {
            console.log('Usando conversa do cache offline como fallback');
            
            const offlineMessages = await offlineCacheService.getConversationMessages(conversationId);
            
            const completeOfflineConversation = {
              ...offlineConversation,
              mensagens: offlineMessages || [],
              unreadCount: 0,
              lastMessageRead: true,
              fromCache: true
            };
            
            dispatchSelectedConversation({
              type: 'SET_CONVERSATION',
              payload: completeOfflineConversation
            });
            return completeOfflineConversation;
          }
        } catch (cacheError) {
          console.error('Erro ao acessar cache offline:', cacheError);
        }
        
        setIsLoading(false);
        return cachedConversation || null;
      }
    } catch (error) {
      console.error('Erro ao selecionar conversa:', error);
      
      try {
        const offlineConversation = await offlineCacheService.getConversation(conversationId);
        
        if (offlineConversation) {
          console.log('Conversa encontrada no cache offline após erro');
          
          const offlineMessages = await offlineCacheService.getConversationMessages(conversationId);
          
          const completeOfflineConversation = {
            ...offlineConversation,
            mensagens: offlineMessages || [],
            unreadCount: 0,
            lastMessageRead: true,
            fromCache: true
          };
          
          dispatchSelectedConversation({
            type: 'SET_CONVERSATION',
            payload: completeOfflineConversation
          });
          selectedConversationIdRef.current = conversationId;
          
          return completeOfflineConversation;
        }
      } catch (cacheError) {
        console.error('Erro ao acessar cache offline:', cacheError);
      }
      
      setIsLoading(false);
      return conversations.find(conv => conv._id === conversationId) || 
             completedConversations.find(conv => conv._id === conversationId) || 
             null;
    } finally {
      setIsLoading(false);
    }
  }, [user, userProfile, conversations, completedConversations, selectedConversation, forceRefreshCurrentConversation, markMessagesAsRead]);

  const sendMessage = useCallback(async (conversationId, text) => {
    if (!conversationId) {
      console.error('ID da conversa é obrigatório para enviar mensagem');
      return false;
    }
    
    try {
      console.log(`Enviando mensagem para conversa ${conversationId}:`, text);
      
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      const optimisticMessage = {
        _id: tempId,
        conversaId: conversationId,
        conteudo: text.trim(),
        remetente: 'atendente',
        timestamp: new Date().toISOString(),
        status: 'sending',
        tempId: tempId,
        createdAt: new Date().toISOString()
      };
      
      optimisticMessagesRef.current.set(tempId, optimisticMessage);
      
      if (selectedConversationIdRef.current === conversationId) {
        dispatchSelectedConversation({
          type: 'ADD_MESSAGE',
          payload: optimisticMessage
        });
      }
      
      dispatchConversations({
        type: 'UPDATE_LAST_MESSAGE',
        payload: {
          conversaId,
          content: text.trim(),
          timestamp: optimisticMessage.timestamp,
          incrementUnread: false,
          isRead: true
        }
      });
      
      globalState.lastConversationUpdate[conversationId] = Date.now();
      
      if (!navigator.onLine) {
        console.log('📱 Dispositivo offline, salvando mensagem para envio posterior');
        
        await offlineCacheService.savePendingMessage(optimisticMessage);
        
        await offlineCacheService.saveMessage({
          ...optimisticMessage,
          status: 'pending'
        }, conversationId);
        
        if (selectedConversationIdRef.current === conversationId) {
          dispatchSelectedConversation({
            type: 'UPDATE_MESSAGE_STATUS',
            payload: {
              id: tempId,
              updates: { status: 'pending' }
            }
          });
        }
        
        notificationService.showToast('Mensagem será enviada quando a conexão for restaurada', 'info');
        
        return {
          success: true,
          pending: true,
          tempId: tempId
        };
      }
      
      const response = await multiflowApi.enviarMensagem(conversationId, text.trim());
      
      if (response.success) {
        console.log('Mensagem enviada com sucesso:', response.data);
        
        lastUpdateTimestampRef.current = Date.now();
        
        if (selectedConversationIdRef.current === conversationId) {
          dispatchSelectedConversation({
            type: 'UPDATE_MESSAGE_STATUS',
            payload: {
              id: tempId,
              tempId: tempId,
              updates: { 
                _id: response.data?.mensagemId || tempId, 
                status: 'sent' 
              }
            }
          });
        }
        
        const confirmedMessage = {
          _id: response.data?.mensagemId || tempId,
          conversaId: conversationId,
          conteudo: text.trim(),
          remetente: 'atendente',
          timestamp: new Date().toISOString(),
          status: 'sent'
        };
        
        await offlineCacheService.saveMessage(confirmedMessage, conversationId);
        
        optimisticMessagesRef.current.delete(tempId);
        
        notificationService.showToast('Mensagem enviada com sucesso', 'success');
        
        return true;
      } else {
        console.error('Falha ao enviar mensagem:', response.error);
        
        if (selectedConversationIdRef.current === conversationId) {
          dispatchSelectedConversation({
            type: 'UPDATE_MESSAGE_STATUS',
            payload: {
              id: tempId,
              updates: { status: 'failed' }
            }
          });
        }
        
        optimisticMessage.status = 'failed';
        await offlineCacheService.savePendingMessage(optimisticMessage);
        
        notificationService.notifyError({
          message: 'Falha ao enviar mensagem. Tente novamente.'
        });
        
        return false;
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    
      const errorTempId = `error-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      if (selectedConversationIdRef.current === conversationId) {
        const pendingMessageId = selectedConversation?.mensagens?.find(
          m => m.status === 'sending' && m.remetente === 'atendente'
        )?._id;
        
        if (pendingMessageId) {
          dispatchSelectedConversation({
            type: 'UPDATE_MESSAGE_STATUS',
            payload: {
              id: pendingMessageId,
              updates: { 
                _id: errorTempId,
                status: 'failed' 
              }
            }
          });
        }
      }
      
      const failedMessage = {
        _id: errorTempId,
        tempId: errorTempId,
        conversaId: conversationId,
        conteudo: text.trim(),
        remetente: 'atendente',
        timestamp: new Date().toISOString(),
        status: 'failed'
      };
      
      try {
        await offlineCacheService.savePendingMessage(failedMessage);
      } catch (cacheError) {
        console.error('Erro ao salvar mensagem com falha no cache:', cacheError);
      }
      
      notificationService.notifyError({
        message: 'Erro ao enviar mensagem. Tente novamente.'
      });
      
      return false;
    }
  }, [selectedConversation]);

  const sendTypingIndicator = useCallback((conversationId) => {
    if (!conversationId || !userProfile) return;
    
    if (debounceTypingRef.current) {
      clearTimeout(debounceTypingRef.current);
    }
    
    debounceTypingRef.current = setTimeout(() => {
      if (realtimeService.isConnected()) {
        realtimeService.sendTypingIndicator(conversationId);
      }
      debounceTypingRef.current = null;
    }, 300);
  }, [userProfile]);

  const transferConversation = useCallback(async (conversationId, sectorId) => {
    try {
      const response = await multiflowApi.transferirConversa(conversationId, sectorId);
      
      if (response.success) {
        if (selectedConversationIdRef.current === conversationId) {
          dispatchSelectedConversation({
            type: 'SET_CONVERSATION',
            payload: null
          });
          selectedConversationIdRef.current = null;
        }
        
        dispatchConversations({
          type: 'UPDATE_CONVERSATION',
          payload: response.data
        });
        
        if (userProfile?.setor && userProfile.role !== 'admin') {
          const userSectorId = userProfile.setor._id || userProfile.setor.id;
          if (sectorId !== userSectorId) {
            dispatchConversations({
              type: 'REMOVE_CONVERSATION',
              payload: conversationId
            });
          }
        }
        
        notificationService.showToast('Conversa transferida com sucesso', 'success');
      }
      
      return response.success;
    } catch (error) {
      console.error('Erro ao transferir conversa:', error);
      
      notificationService.notifyError({
        message: 'Erro ao transferir conversa. Tente novamente.'
      });
      
      return false;
    }
  }, [userProfile]);

  const finishConversation = useCallback(async (conversationId) => {
    try {
      console.log(`Finalizando conversa ${conversationId}`);
      
      const response = await multiflowApi.finalizarConversa(conversationId);
      
      if (response && response.success) {
        console.log('Conversa finalizada com sucesso');
        
        if (selectedConversationIdRef.current === conversationId) {
          dispatchSelectedConversation({
            type: 'SET_CONVERSATION',
            payload: null
          });
          selectedConversationIdRef.current = null;
        }
        
        const conversationToMove = conversations.find(conv => conv._id === conversationId);
        if (conversationToMove) {
          setCompletedConversations(prev => [
            { ...conversationToMove, status: MultiFlowStatusMap.FINALIZADA },
            ...prev
          ]);
          
          dispatchConversations({
            type: 'REMOVE_CONVERSATION',
            payload: conversationId
          });
        }
        
        notificationService.showToast('Conversa finalizada com sucesso', 'success');
        
        return true;
      } else {
        console.error('Erro ao finalizar conversa:', response);
        
        notificationService.notifyError({
          message: 'Erro ao finalizar conversa. Tente novamente.'
        });
        
        return false;
      }
    } catch (error) {
      console.error(`Erro ao finalizar conversa ${conversationId}:`, error);
      
      notificationService.notifyError({
        message: 'Erro ao finalizar conversa. Tente novamente.'
      });
      
      return false;
    }
  }, [conversations]);

  const archiveConversation = useCallback(async (conversationId) => {
    try {
      console.log(`Arquivando conversa ${conversationId}`);
      
      const response = await multiflowApi.arquivarConversa(conversationId);
      
      if (response && response.success) {
        console.log('Conversa arquivada com sucesso');
        
        if (selectedConversationIdRef.current === conversationId) {
          dispatchSelectedConversation({
            type: 'SET_CONVERSATION',
            payload: null
          });
          selectedConversationIdRef.current = null;
        }
        
        dispatchConversations({
          type: 'REMOVE_CONVERSATION',
          payload: conversationId
        });
        
        setCompletedConversations(prev => 
          prev.filter(conv => conv._id !== conversationId)
        );
        
        notificationService.showToast('Conversa arquivada com sucesso', 'success');
        
        return true;
      } else {
        console.error('Erro ao arquivar conversa:', response);
        
        notificationService.notifyError({
          message: 'Erro ao arquivar conversa. Tente novamente.'
        });
        
        return false;
      }
    } catch (error) {
      console.error(`Erro ao arquivar conversa ${conversationId}:`, error);
      
      notificationService.notifyError({
        message: 'Erro ao arquivar conversa. Tente novamente.'
      });
      
      return false;
    }
  }, []);

  const refreshCompletedConversations = useCallback(async () => {
    if (isRefreshingCompletedRef.current) {
      console.log('Já existe uma atualização de conversas concluídas em andamento, ignorando');
      return false;
    }
    
    isRefreshingCompletedRef.current = true;
    console.log('Buscando conversas concluídas...');
    
    try {
      const filters = {
        status: [MultiFlowStatusMap.FINALIZADA],
        page: 1,
        limit: 50
      };
      
      const response = await multiflowApi.getConversas(filters);
      
      if (response.success && Array.isArray(response.data)) {
        console.log("Conversas concluídas obtidas:", response.data.length);
        
        const sortedCompletedConversations = [...response.data].sort((a, b) => {
          const aTime = new Date(a.ultimaAtividade || a.criadoEm || 0).getTime();
          const bTime = new Date(b.ultimaAtividade || b.criadoEm || 0).getTime();
          return bTime - aTime;
        });
        
        setCompletedConversations(sortedCompletedConversations);
      } else {
        console.warn('Falha ao buscar conversas concluídas:', response);
        
        if (!response.success) {
          notificationService.notifyError({
            message: 'Erro ao carregar conversas concluídas. Tente novamente.'
          });
        }
      }
      
      return response.success;
    } catch (error) {
      console.error('Erro ao buscar conversas concluídas:', error);
      
      notificationService.notifyError({
        message: 'Erro ao carregar conversas concluídas. Tente novamente.'
      });
      
      return false;
    } finally {
      setTimeout(() => {
        isRefreshingCompletedRef.current = false;
      }, 1000);
    }
  }, []);

  const retryFailedMessage = useCallback(async (conversationId, messageId, text) => {
    try {
      console.log(`Reenviando mensagem: ${messageId} para conversa: ${conversationId}`);
      
      if (selectedConversationIdRef.current === conversationId) {
        dispatchSelectedConversation({
          type: 'UPDATE_MESSAGE_STATUS',
          payload: {
            id: messageId,
            updates: { status: 'sending' }
          }
        });
      }
      
      await offlineCacheService.removePendingMessage(messageId);
      
      return await sendMessage(conversationId, text);
    } catch (error) {
      console.error('Erro ao reenviar mensagem:', error);
      return false;
    }
  }, [sendMessage]);

  const clearUnreadMessages = useCallback(() => {
    setHasUnreadMessages(false);
    
    document.title = document.title.split(' • ')[0] || 'Dashboard';
    
    if (selectedConversationIdRef.current) {
      markMessagesAsRead(selectedConversationIdRef.current);
    }
  }, [markMessagesAsRead]);
  
  const testReceiveMessage = useCallback((conversationId, text = "Mensagem de teste simulada") => {
    if (!conversationId) {
      console.error('ID da conversa obrigatório para testar recebimento de mensagem');
      return;
    }
    
    console.log(`Simulando recebimento de mensagem na conversa ${conversationId}`);
    const mockMessage = realtimeService.simulateNewMessage(conversationId, text);
    return mockMessage;
  }, []);

  const value = useMemo(() => ({
    isConnected,
    isOnline,
    connectionError,
    conversations,
    completedConversations,
    selectedConversation,
    hasUnreadMessages,
    isLoading,
    typingUsers,
    selectConversation,
    sendMessage,
    sendTypingIndicator,
    transferConversation,
    finishConversation,
    archiveConversation,
    refreshConversations,
    refreshCompletedConversations,
    retryFailedMessage,
    clearUnreadMessages,
    markMessagesAsRead,
    testReceiveMessage,
    forceRefreshCurrentConversation,
    syncPendingMessages,
    api: multiflowApi,
    realtimeService,
    notificationService,
    offlineCacheService
  }), [
    isConnected,
    isOnline,
    connectionError,
    conversations,
    completedConversations,
    selectedConversation,
    hasUnreadMessages,
    isLoading,
    typingUsers,
    selectConversation,
    sendMessage,
    sendTypingIndicator,
    transferConversation,
    finishConversation,
    archiveConversation,
    refreshConversations,
    refreshCompletedConversations,
    retryFailedMessage,
    clearUnreadMessages,
    markMessagesAsRead,
    testReceiveMessage,
    forceRefreshCurrentConversation,
    syncPendingMessages
  ]);

  window.socketContext = value;

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};