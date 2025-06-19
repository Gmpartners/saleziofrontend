import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { socketService } from '../services/socket';
import { multiflowApi } from '../services/multiflowApi';

import { useAuthContext } from '../hooks/useAuthContext';

const STATUS = {
  AGUARDANDO: 'aguardando',
  EM_ANDAMENTO: 'em_andamento',
  FINALIZADA: 'finalizada',
  ARQUIVADA: 'arquivada'
};

export const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user, userProfile, isAdmin } = useAuthContext();
  const [isConnected, setIsConnected] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [completedConversations, setCompletedConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [toastNotification, setToastNotification] = useState({
    show: false,
    message: '',
    sender: '',
    conversationId: null
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 1
  });
  
  const refs = {
    selectedConversationId: useRef(null),
    appFocused: useRef(document.hasFocus()),
    isRefreshing: useRef(false),
    conversations: useRef([]),
    completedConversations: useRef([]),
    optimisticMessages: useRef(new Map()),
    updateInterval: useRef(null),
    lastUpdateTime: useRef(Date.now()),
    retryTimeouts: useRef({}),
    sectorCache: useRef(new Map())
  };
  
  const maxRetries = 3;
  
  const getCurrentUserId = useCallback(() => {
    return multiflowApi.ADMIN_ID;
  }, []);
  
  useEffect(() => {
    const storedToken = localStorage.getItem('apiToken');
    const defaultToken = import.meta.env.VITE_API_TOKEN || 'netwydZWjrJpA';
    
    if (!storedToken || storedToken === 'undefined' || storedToken === 'null') {
      console.log('Atualizando token de API...');
      localStorage.setItem('apiToken', defaultToken);
      multiflowApi.refreshToken();
    }
  }, []);
  
  const enrichConversationWithSectorData = useCallback(async (conversation) => {
    if (!conversation) return conversation;
    
    const setorId = conversation.setorId;
    if (!setorId) return conversation;
    
    if (typeof setorId === 'object' && setorId.nome) return conversation;
    
    const normalizedSetorId = multiflowApi.normalizeId(setorId, 'setor');
    
    if (refs.sectorCache.current.has(normalizedSetorId)) {
      return {
        ...conversation,
        setorInfo: refs.sectorCache.current.get(normalizedSetorId),
        originalSetorId: setorId
      };
    }
    
    try {
      const isAdminUser = userProfile?.role === 'admin' || isAdmin;
      const userId = multiflowApi.ADMIN_ID;
      
      const response = await multiflowApi.getSetorById(normalizedSetorId, userId, isAdminUser);
      
      if (response.success && response.data) {
        refs.sectorCache.current.set(normalizedSetorId, response.data);
        
        return {
          ...conversation,
          setorInfo: response.data,
          originalSetorId: setorId
        };
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes do setor:', error);
    }
    
    return conversation;
  }, [userProfile, isAdmin]);
  
  const enrichConversationsWithSectorData = useCallback(async (conversations) => {
    if (!Array.isArray(conversations) || conversations.length === 0) return [];
    
    const uniqueSectorIds = new Set();
    conversations.forEach(conv => {
      if (conv.setorId && typeof conv.setorId !== 'object') {
        uniqueSectorIds.add(multiflowApi.normalizeId(conv.setorId, 'setor'));
      }
    });
    
    if (uniqueSectorIds.size > 0) {
      const isAdminUser = userProfile?.role === 'admin' || isAdmin;
      const userId = multiflowApi.ADMIN_ID;
      
      const sectorPromises = Array.from(uniqueSectorIds).map(async (setorId) => {
        if (refs.sectorCache.current.has(setorId)) return;
        
        try {
          const response = await multiflowApi.getSetorById(setorId, userId, isAdminUser);
          if (response.success && response.data) {
            refs.sectorCache.current.set(setorId, response.data);
          }
        } catch (error) {
          console.error(`Erro ao buscar setor ${setorId}:`, error);
        }
      });
      
      await Promise.all(sectorPromises);
    }
    
    return conversations.map(conv => {
      if (!conv.setorId || typeof conv.setorId === 'object') return conv;
      
      const normalizedSetorId = multiflowApi.normalizeId(conv.setorId, 'setor');
      if (refs.sectorCache.current.has(normalizedSetorId)) {
        return {
          ...conv,
          setorInfo: refs.sectorCache.current.get(normalizedSetorId),
          originalSetorId: conv.setorId
        };
      }
      
      return conv;
    });
  }, [userProfile, isAdmin]);
  
  const markMessagesAsRead = useCallback((conversationId) => {
    if (!conversationId || !userProfile) return;
    
    const normalizedId = multiflowApi.normalizeId(conversationId, 'conversa');
    
    setConversations(prev => 
      prev.map(conv => {
        if (conv.conversaId === normalizedId || conv._id === normalizedId) {
          return { ...conv, unreadCount: 0, lastMessageRead: true, hasNewMessage: false };
        }
        return conv;
      })
    );
    
    try {
      const isAdminUser = userProfile?.role === 'admin' || isAdmin;
      const userId = multiflowApi.ADMIN_ID;
      
      socketService.markMessagesAsRead(normalizedId, isAdminUser);
      multiflowApi.markConversationAsRead(normalizedId, userId, isAdminUser);
    } catch (error) {
      console.error('Erro ao marcar mensagens como lidas:', error);
    }
  }, [userProfile, isAdmin]);
  
  const clearAllRetryTimeouts = () => {
    Object.keys(refs.retryTimeouts.current).forEach(timeoutId => {
      clearTimeout(refs.retryTimeouts.current[timeoutId]);
    });
    refs.retryTimeouts.current = {};
  };
  
  const performWithRetry = useCallback(async (operation, operationName, maxRetries = 3, initialDelay = 1000) => {
    let retryCount = 0;
    let lastError = null;
    
    const execute = async () => {
      try {
        const result = await operation();
        return { success: true, data: result };
      } catch (error) {
        console.error(`Erro na operação ${operationName} (tentativa ${retryCount + 1}/${maxRetries}):`, error);
        lastError = error;
        
        if (error.message && (error.message.includes('Unauthorized') || error.message.includes('Token') || 
            error.message.includes('expired') || error.message.includes('invalid'))) {
          console.log('Erro de autenticação, atualizando token...');
          multiflowApi.refreshToken();
        }
        
        if (retryCount < maxRetries - 1) {
          retryCount++;
          const delay = initialDelay * Math.pow(2, retryCount - 1);
          
          return new Promise(resolve => {
            const timeoutId = setTimeout(() => {
              delete refs.retryTimeouts.current[timeoutId];
              resolve(execute());
            }, delay);
            refs.retryTimeouts.current[timeoutId] = timeoutId;
          });
        }
        
        return { success: false, error: lastError };
      }
    };
    
    return execute();
  }, []);
  
  const sortConversationsByActivity = useCallback((conversations) => {
    return [...conversations].sort((a, b) => {
      const aTime = new Date(a.ultimaAtividade || a.created || 0).getTime();
      const bTime = new Date(b.ultimaAtividade || b.created || 0).getTime();
      return bTime - aTime;
    });
  }, []);
  
  const normalizeSetorId = useCallback((setorId) => {
    return multiflowApi.normalizeId(setorId, 'setor');
  }, []);
  
  const refreshConversations = useCallback(async (filters = {}) => {
    if (refs.isRefreshing.current) {
      return false;
    }
    
    refs.isRefreshing.current = true;
    setIsLoading(true);
    
    try {
      const isAdminUser = userProfile?.role === 'admin' || isAdmin;
      const userId = multiflowApi.ADMIN_ID;
      
      const defaultFilters = {
        status: [STATUS.AGUARDANDO, STATUS.EM_ANDAMENTO],
        arquivada: false,
        page: pagination.page,
        limit: pagination.limit,
        forceRefresh: true
      };
      
      const mergedFilters = { ...defaultFilters, ...filters };
      
      if (!isAdminUser) {
        let setorId = null;
        
        if (userProfile?.setor) {
          setorId = normalizeSetorId(userProfile.setor);
        }
        
        if (!setorId) {
          setorId = localStorage.getItem('userSectorId');
          if (setorId) setorId = setorId.toString();
        }
        
        if (setorId) {
          mergedFilters.setorId = setorId;
        }
      }
      
      if (mergedFilters.status !== STATUS.FINALIZADA) {
        setConversations([]);
      }
      
      console.log(`Buscando conversas para usuário ${userId} com filtros:`, mergedFilters);
      const response = await multiflowApi.getConversas(mergedFilters, userId, isAdminUser);
      
      if (response.success) {
        if (Array.isArray(response.data)) {
          const enrichedConversations = await enrichConversationsWithSectorData(response.data);
          setConversations(sortConversationsByActivity(enrichedConversations));
          
          if (response.pagination) {
            setPagination(response.pagination);
          }
        } else {
          setConversations([]);
        }
        return response;
      } else {
        console.error('Resposta da API sem sucesso:', response);
        setConversations([]);
        return response;
      }
    } catch (error) {
      console.error('Erro ao buscar conversas:', error);
      setConversations([]);
      return {
        success: false,
        error: error.message
      };
    } finally {
      refs.isRefreshing.current = false;
      setIsLoading(false);
    }
  }, [userProfile, isAdmin, pagination, normalizeSetorId, sortConversationsByActivity, enrichConversationsWithSectorData]);

  const refreshCompletedConversations = useCallback(async (filters = {}) => {
    setIsLoading(true);
    
    try {
      const isAdminUser = userProfile?.role === 'admin' || isAdmin;
      const userId = multiflowApi.ADMIN_ID;
      
      const defaultFilters = {
        status: STATUS.FINALIZADA,
        arquivada: false,
        page: pagination.page,
        limit: pagination.limit,
        forceRefresh: true
      };
      
      const mergedFilters = { ...defaultFilters, ...filters };
      
      if (!isAdminUser) {
        let setorId = null;
        
        if (userProfile?.setor) {
          setorId = normalizeSetorId(userProfile.setor);
        }
        
        if (!setorId) {
          setorId = localStorage.getItem('userSectorId');
          if (setorId) setorId = setorId.toString();
        }
        
        if (setorId) {
          mergedFilters.setorId = setorId;
        }
      }
      
      setCompletedConversations([]);
      
      console.log(`Buscando conversas finalizadas para usuário ${userId} com filtros:`, mergedFilters);
      const response = await multiflowApi.getConversas(mergedFilters, userId, isAdminUser);
      
      if (response.success && Array.isArray(response.data)) {
        const enrichedConversations = await enrichConversationsWithSectorData(response.data);
        setCompletedConversations(enrichedConversations);
        
        if (response.pagination) {
          setPagination(response.pagination);
        }
        
        return {
          success: true,
          data: enrichedConversations,
          pagination: response.pagination
        };
      } else {
        console.error('Resposta da API sem sucesso:', response);
        setCompletedConversations([]);
        return response;
      }
    } catch (error) {
      console.error('Erro ao buscar conversas concluídas:', error);
      setCompletedConversations([]);
      
      return {
        success: false,
        error: error.message
      };
    } finally {
      setIsLoading(false);
    }
  }, [userProfile, isAdmin, pagination, normalizeSetorId, enrichConversationsWithSectorData]);
  
  const updateConversationStatus = useCallback(async (conversationId, newStatus, atendenteId = null) => {
    try {
      const normalizedId = multiflowApi.normalizeId(conversationId, 'conversa');
      
      const isAdminUser = userProfile?.role === 'admin' || isAdmin;
      const userId = multiflowApi.ADMIN_ID;
      
      console.log(`Atualizando status da conversa ${normalizedId} para ${newStatus}`);
      await multiflowApi.updateStatus(normalizedId, newStatus, userId, atendenteId, isAdminUser);
      
      setSelectedConversation(prev => {
        if (!prev) return null;
        
        if (prev.conversaId === normalizedId || prev._id === normalizedId) {
          return { ...prev, status: newStatus };
        }
        return prev;
      });
    } catch (error) {
      console.error('Erro ao atualizar status da conversa:', error);
    }
  }, [isAdmin, userProfile]);
  
  const forceRefreshCurrentConversation = useCallback(async () => {
    if (refs.selectedConversationId.current) {
      return selectConversation(refs.selectedConversationId.current);
    }
    return null;
  }, []);
  
  const selectConversation = useCallback(async (conversationId) => {
    try {
      setIsLoading(true);
      
      const isAdminUser = userProfile?.role === 'admin' || isAdmin;
      const userId = multiflowApi.ADMIN_ID;
      
      const normalizedId = multiflowApi.normalizeId(conversationId, 'conversa');
      
      if (refs.selectedConversationId.current && 
          refs.selectedConversationId.current !== normalizedId) {
        try {
          socketService.unsubscribeFromConversation(refs.selectedConversationId.current, isAdminUser);
        } catch (error) {
          console.error("Erro ao cancelar inscrição na conversa anterior:", error);
        }
      }
      
      try {
        socketService.subscribeToConversation(normalizedId, isAdminUser);
      } catch (error) {
        console.error("Erro ao inscrever-se na nova conversa:", error);
      }
      
      const cachedConversation = refs.conversations.current.find(c => 
        (c.conversaId === normalizedId || c._id === normalizedId)
      ) || refs.completedConversations.current.find(c => 
        (c.conversaId === normalizedId || c._id === normalizedId)
      );
      
      console.log(`Buscando conversa ${normalizedId} para usuário ${userId}`);
      const response = await multiflowApi.getConversa(normalizedId, userId, true, isAdminUser);
      
      if (response.success && response.data) {
        const enrichedConversation = await enrichConversationWithSectorData({
          ...response.data,
          unreadCount: 0,
          lastMessageRead: true,
          hasNewMessage: false
        });
        
        if (!Array.isArray(enrichedConversation.mensagens)) {
          enrichedConversation.mensagens = [];
        }
        
        setConversations(prev => 
          prev.map(c => {
            if (c.conversaId === normalizedId || c._id === normalizedId) {
              return {
                ...enrichedConversation,
                hasNewMessage: false
              };
            }
            return c;
          })
        );
        
        setSelectedConversation(enrichedConversation);
        refs.selectedConversationId.current = normalizedId;
        refs.lastUpdateTime.current = Date.now();
        
        markMessagesAsRead(normalizedId);
        
        if (response.data.status === STATUS.AGUARDANDO) {
          await updateConversationStatus(normalizedId, STATUS.EM_ANDAMENTO);
        }
        
        return enrichedConversation;
      } else {
        console.error('Resposta da API sem sucesso:', response);
        if (cachedConversation) {
          const enrichedCachedConversation = await enrichConversationWithSectorData(cachedConversation);
          setSelectedConversation(enrichedCachedConversation);
          return enrichedCachedConversation;
        } else {
          throw new Error('Não foi possível carregar a conversa');
        }
      }
    } catch (error) {
      console.error('Erro ao selecionar conversa:', error);
      
      const normalizedId = multiflowApi.normalizeId(conversationId, 'conversa');
      const cachedConversation = refs.conversations.current.find(c => 
        (c.conversaId === normalizedId || c._id === normalizedId)
      ) || refs.completedConversations.current.find(c => 
        (c.conversaId === normalizedId || c._id === normalizedId)
      );
      
      if (cachedConversation) {
        const enrichedCachedConversation = await enrichConversationWithSectorData(cachedConversation);
        setSelectedConversation(enrichedCachedConversation);
        return enrichedCachedConversation;
      } else {
        setSelectedConversation(null);
        return null;
      }
    } finally {
      setIsLoading(false);
    }
  }, [userProfile, isAdmin, markMessagesAsRead, updateConversationStatus, enrichConversationWithSectorData]);
  
  const createOptimisticMessage = useCallback((conversationId, text, tempId) => {
    return {
      _id: tempId,
      conversaId: conversationId,
      conteudo: text.trim(),
      remetente: 'atendente',
      timestamp: new Date().toISOString(),
      status: 'sending',
      lida: false,
      tipo: 'texto',
      nome: userProfile?.nome || 'Atendente'
    };
  }, [userProfile]);
  
  const updateUIWithOptimisticMessage = useCallback((conversationId, optimisticMessage) => {
    const normalizedId = multiflowApi.normalizeId(conversationId, 'conversa');
    
    if (refs.selectedConversationId.current === normalizedId) {
      setSelectedConversation(prev => {
        if (!prev) return null;
        
        const mensagens = Array.isArray(prev.mensagens) ? prev.mensagens : [];
        
        return {
          ...prev,
          mensagens: [...mensagens, optimisticMessage],
          ultimaAtividade: new Date().toISOString(),
          ultimaMensagem: optimisticMessage.conteudo
        };
      });
    }
    
    setConversations(prev => {
      return prev.map(conv => {
        if (conv.conversaId === normalizedId || conv._id === normalizedId) {
          return {
            ...conv,
            ultimaAtividade: new Date().toISOString(),
            ultimaMensagem: optimisticMessage.conteudo,
            lastMessageRead: true
          };
        }
        return conv;
      });
    });
  }, []);
  
  const updateMessageStatusAfterSend = useCallback((conversationId, tempId, messageId) => {
    const normalizedId = multiflowApi.normalizeId(conversationId, 'conversa');
    
    setSelectedConversation(prev => {
      if (!prev) return null;
      
      const mensagens = Array.isArray(prev.mensagens) ? prev.mensagens : [];
      
      return {
        ...prev,
        mensagens: mensagens.map(msg => 
          msg._id === tempId ? 
            { ...msg, _id: messageId || msg._id, status: 'sent', lida: true } : 
            msg
        )
      };
    });
  }, []);
  
  const markMessageAsFailed = useCallback((conversationId, tempId) => {
    const normalizedId = multiflowApi.normalizeId(conversationId, 'conversa');
    
    if (refs.selectedConversationId.current === normalizedId) {
      setSelectedConversation(prev => {
        if (!prev) return null;
        
        const mensagens = Array.isArray(prev.mensagens) ? prev.mensagens : [];
        
        return {
          ...prev,
          mensagens: mensagens.map(msg => 
            msg._id === tempId ? { ...msg, status: 'failed' } : msg
          )
        };
      });
    }
  }, []);
  
  const sendMessageToApi = useCallback(async (conversationId, text, tempId, isAdminUser) => {
    const normalizedId = multiflowApi.normalizeId(conversationId, 'conversa');
    const userId = multiflowApi.ADMIN_ID;
    
    const sendOperation = async () => {
      console.log(`Enviando mensagem para conversa ${normalizedId}, usuário ${userId}`);
      const response = await multiflowApi.enviarMensagem(normalizedId, text.trim(), userId, 'texto', isAdminUser);
      
      if (response.success) {
        if (refs.selectedConversationId.current === normalizedId) {
          updateMessageStatusAfterSend(normalizedId, tempId, response.data?.mensagemId || response.data?._id);
        }
        
        refs.optimisticMessages.current.delete(tempId);
        return true;
      } else {
        console.error('Resposta da API sem sucesso:', response);
        throw new Error(response.error || 'Falha ao enviar mensagem');
      }
    };
    
    const result = await performWithRetry(
      sendOperation,
      'envio de mensagem',
      maxRetries,
      1000
    );
    
    if (!result.success) {
      markMessageAsFailed(normalizedId, tempId);
    }
    
    return result;
  }, [performWithRetry, updateMessageStatusAfterSend, markMessageAsFailed]);
  
  const sendMessage = useCallback(async (conversationId, text) => {
    try {
      if (!text.trim() || !conversationId) {
        return false;
      }
      
      const normalizedId = multiflowApi.normalizeId(conversationId, 'conversa');
      const isAdminUser = userProfile?.role === 'admin' || isAdmin;
      
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      const optimisticMessage = createOptimisticMessage(normalizedId, text, tempId);
      
      refs.optimisticMessages.current.set(tempId, optimisticMessage);
      updateUIWithOptimisticMessage(normalizedId, optimisticMessage);
      
      const result = await sendMessageToApi(normalizedId, text, tempId, isAdminUser);
      return result.success;
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      return false;
    }
  }, [userProfile, isAdmin, createOptimisticMessage, updateUIWithOptimisticMessage, sendMessageToApi]);
  
  const retryFailedMessage = useCallback(async (conversationId, messageId, content) => {
    try {
      const normalizedId = multiflowApi.normalizeId(conversationId, 'conversa');
      
      if (refs.selectedConversationId.current === normalizedId) {
        setSelectedConversation(prev => {
          if (!prev) return null;
          
          const mensagens = Array.isArray(prev.mensagens) ? prev.mensagens : [];
          
          return {
            ...prev,
            mensagens: mensagens.filter(msg => msg._id !== messageId)
          };
        });
      }
      
      return await sendMessage(normalizedId, content);
    } catch (error) {
      console.error('Erro ao reenviar mensagem:', error);
      return false;
    }
  }, [sendMessage]);
  
  const sendTypingIndicator = useCallback((conversationId) => {
    if (!conversationId || !isConnected) return;
    
    const normalizedId = multiflowApi.normalizeId(conversationId, 'conversa');
    
    try {
      const isAdminUser = userProfile?.role === 'admin' || isAdmin;
      socketService.sendTypingIndicator(normalizedId, isAdminUser);
    } catch (error) {
      console.error("Erro ao enviar indicador de digitação:", error);
    }
  }, [isConnected, userProfile, isAdmin]);
  
  const transferConversation = useCallback(async (conversationId, targetSectorId, motivo = '') => {
    if (!conversationId || !targetSectorId) {
      return { success: false, error: 'IDs inválidos para transferência' };
    }
    
    try {
      const normalizedId = multiflowApi.normalizeId(conversationId, 'conversa');
      
      console.log(`Preparando transferência da conversa ${normalizedId} para setor ${targetSectorId}`);
      
      const isAdminUser = userProfile?.role === 'admin' || isAdmin;
      const userId = multiflowApi.ADMIN_ID;
      
      const response = await multiflowApi.transferirConversa(
        normalizedId, 
        targetSectorId, 
        userId, 
        motivo,
        isAdminUser
      );
      
      console.log('Resposta da transferência:', response);
      
      if (response.success) {
        if (refs.selectedConversationId.current === normalizedId) {
          try {
            socketService.unsubscribeFromConversation(normalizedId, isAdminUser);
          } catch (error) {
            console.error("Erro ao cancelar inscrição na conversa transferida:", error);
          }
          
          setSelectedConversation(null);
          refs.selectedConversationId.current = null;
        }
        
        setConversations(prev => 
          prev.filter(c => (c.conversaId !== normalizedId && c._id !== normalizedId))
        );
        
        return { success: true };
      }
      
      return { 
        success: false, 
        error: response.error || 'Falha na transferência' 
      };
    } catch (error) {
      console.error('Erro na operação de transferência:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }, [userProfile, isAdmin]);
  
  const finishConversation = useCallback(async (conversationId) => {
    if (!conversationId) {
      return false;
    }
    
    try {
      const normalizedId = multiflowApi.normalizeId(conversationId, 'conversa');
      
      const isAdminUser = userProfile?.role === 'admin' || isAdmin;
      const userId = multiflowApi.ADMIN_ID;
      
      const finishOperation = async () => {
        console.log(`Finalizando conversa ${normalizedId}`);
        const response = await multiflowApi.finalizarConversa(normalizedId, userId, isAdminUser);
        
        if (!response.success) {
          console.error('Resposta da API sem sucesso:', response);
          throw new Error(response.error || 'Falha ao finalizar conversa');
        }
        
        return response;
      };
      
      const result = await performWithRetry(
        finishOperation,
        'finalização de conversa',
        maxRetries,
        1000
      );
      
      if (result.success) {
        const conversation = refs.conversations.current.find(c => 
          (c.conversaId === normalizedId || c._id === normalizedId)
        );
        
        setConversations(prev => 
          prev.filter(c => (c.conversaId !== normalizedId && c._id !== normalizedId))
        );
        
        if (conversation) {
          setCompletedConversations(prev => [
            {
              ...conversation,
              status: STATUS.FINALIZADA
            },
            ...prev
          ]);
        }
        
        if (refs.selectedConversationId.current === normalizedId) {
          setSelectedConversation(prev => ({
            ...prev,
            status: STATUS.FINALIZADA
          }));
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao finalizar conversa:', error);
      return false;
    }
  }, [userProfile, isAdmin, performWithRetry]);
  
  const archiveConversation = useCallback(async (conversationId) => {
    if (!conversationId) {
      return false;
    }
    
    try {
      const normalizedId = multiflowApi.normalizeId(conversationId, 'conversa');
      
      const isAdminUser = userProfile?.role === 'admin' || isAdmin;
      const userId = multiflowApi.ADMIN_ID;
      
      const archiveOperation = async () => {
        console.log(`Arquivando conversa ${normalizedId}`);
        const response = await multiflowApi.arquivarConversa(normalizedId, userId, isAdminUser);
        
        if (!response.success) {
          console.error('Resposta da API sem sucesso:', response);
          throw new Error(response.error || 'Falha ao arquivar conversa');
        }
        
        return response;
      };
      
      const result = await performWithRetry(
        archiveOperation,
        'arquivamento de conversa',
        maxRetries,
        1000
      );
      
      if (result.success) {
        if (refs.selectedConversationId.current === normalizedId) {
          try {
            socketService.unsubscribeFromConversation(normalizedId, isAdminUser);
          } catch (error) {
            console.error("Erro ao cancelar inscrição na conversa arquivada:", error);
          }
          
          setSelectedConversation(null);
          refs.selectedConversationId.current = null;
        }
        
        setConversations(prev => 
          prev.filter(c => (c.conversaId !== normalizedId && c._id !== normalizedId))
        );
        setCompletedConversations(prev => 
          prev.filter(c => (c.conversaId !== normalizedId && c._id !== normalizedId))
        );
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Erro ao arquivar conversa:', error);
      return false;
    }
  }, [userProfile, isAdmin, performWithRetry]);
  
  const clearUnreadMessages = useCallback(() => {
    setHasUnreadMessages(false);
  }, []);
  
  const closeToast = useCallback(() => {
    setToastNotification(prev => ({ ...prev, show: false }));
  }, []);
  
  const handleToastClick = useCallback(() => {
    if (toastNotification.conversationId) {
      selectConversation(toastNotification.conversationId);
      closeToast();
    }
  }, [toastNotification.conversationId, selectConversation, closeToast]);
  
  useEffect(() => {
    refs.conversations.current = conversations;
  }, [conversations]);
  
  useEffect(() => {
    refs.completedConversations.current = completedConversations;
  }, [completedConversations]);
  
  useEffect(() => {
    socketService.initialize('/');
    return () => {
      socketService.disconnect();
    };
  }, []);
  
  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      try {
        refreshConversations({ forceRefresh: true });
      } catch (error) {
        console.error("Erro ao atualizar conversas:", error);
      }
    };
    
    const handleDisconnect = () => {
      setIsConnected(false);
    };
    
    const unsubscribeConnect = socketService.on('connect', handleConnect);
    const unsubscribeDisconnect = socketService.on('disconnect', handleDisconnect);
    
    setIsConnected(socketService.isConnectedToServer());
    
    return () => {
      unsubscribeConnect();
      unsubscribeDisconnect();
    };
  }, [refreshConversations]);
  
  useEffect(() => {
    if (userProfile) {
      socketService.authenticate(multiflowApi.ADMIN_ID, userProfile);
      
      if (userProfile.role === 'admin' || isAdmin) {
        socketService.subscribeToAdminEvents();
      }
    }
  }, [userProfile, isAdmin]);
  
  useEffect(() => {
    const handleFocus = () => {
      refs.appFocused.current = true;
      
      if (selectedConversation?._id || selectedConversation?.conversaId) {
        const conversationId = selectedConversation.conversaId || selectedConversation._id;
        markMessagesAsRead(conversationId);
        selectConversation(conversationId);
      }
      
      setToastNotification(prev => ({...prev, show: false}));
    };
    
    const handleBlur = () => {
      refs.appFocused.current = false;
    };
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [selectedConversation, markMessagesAsRead, selectConversation]);
  
  const processTypingIndicator = useCallback((data) => {
    if (!data || !data.conversaId) return;
    
    setTypingUsers(prev => ({
      ...prev,
      [data.conversaId]: {
        userId: data.userId,
        timestamp: Date.now()
      }
    }));
    
    setTimeout(() => {
      setTypingUsers(prev => {
        const newState = {...prev};
        if (newState[data.conversaId] && newState[data.conversaId].userId === data.userId) {
          delete newState[data.conversaId];
        }
        return newState;
      });
    }, 3000);
  }, []);
  
  const handleUnreadMessage = useCallback((data) => {
    setHasUnreadMessages(true);
    
    const conversationId = data.conversaId;
    const conversation = refs.conversations.current.find(c => 
      (c.conversaId === conversationId || c._id === conversationId)
    );
    
    setToastNotification({
      show: true,
      message: data.mensagem.conteudo,
      sender: conversation?.nomeCliente || 'Cliente',
      conversationId: conversationId
    });
  }, []);
  
  const updateConversationsWithNewMessage = useCallback((data, isCurrentConversation) => {
    if (isCurrentConversation) {
      updateSelectedConversationWithNewMessage(data);
    }
    
    const conversationId = data.conversaId;
    
    setConversations(prev => {
      const updatedConversations = prev.map(conv => {
        if (conv.conversaId === conversationId || conv._id === conversationId) {
          return {
            ...conv,
            ultimaMensagem: data.mensagem.conteudo,
            ultimaAtividade: data.mensagem.timestamp || new Date().toISOString(),
            unreadCount: (!isCurrentConversation || !refs.appFocused.current) 
              ? (conv.unreadCount || 0) + 1 
              : conv.unreadCount || 0,
            hasNewMessage: (!isCurrentConversation || !refs.appFocused.current)
          };
        }
        return conv;
      });
      
      if (!updatedConversations.some(c => 
        (c.conversaId === conversationId || c._id === conversationId)
      )) {
        refreshConversations({ forceRefresh: true });
        return prev;
      }
      
      return sortConversationsByActivity(updatedConversations);
    });
  }, [refreshConversations, sortConversationsByActivity]);
  
  const updateSelectedConversationWithNewMessage = useCallback((data) => {
    setSelectedConversation(prev => {
      if (!prev) return null;
      
      const mensagens = [...(prev.mensagens || [])];
      const existingIndex = mensagens.findIndex(m => 
        m._id === data.mensagem._id || 
        (m.timestamp === data.mensagem.timestamp && m.conteudo === data.mensagem.conteudo)
      );
      
      if (existingIndex >= 0) {
        return prev;
      }
      
      return {
        ...prev,
        mensagens: [...mensagens, data.mensagem],
        ultimaAtividade: data.mensagem.timestamp || new Date().toISOString(),
        ultimaMensagem: data.mensagem.conteudo
      };
    });
  }, []);
  
  const processNewMessage = useCallback((data) => {
    if (!data || !data.conversaId || !data.mensagem) {
      console.error("Dados de mensagem inválidos:", data);
      return;
    }
    
    const conversationId = data.conversaId;
    const isCurrentConversation = refs.selectedConversationId.current === conversationId;
    const isWindowFocused = refs.appFocused.current;
    
    if (!isWindowFocused || !isCurrentConversation) {
      handleUnreadMessage(data);
    }
    
    updateConversationsWithNewMessage(data, isCurrentConversation);
  }, [handleUnreadMessage, updateConversationsWithNewMessage]);
  
  const processConversationUpdate = useCallback((data) => {
    if (!data || !data._id) return;
    
    const conversationId = data.conversaId || data._id;
    
    setConversations(prev => 
      prev.map(c => {
        if (c.conversaId === conversationId || c._id === conversationId) {
          return {...c, ...data};
        }
        return c;
      })
    );
    
    if (refs.selectedConversationId.current === conversationId) {
      setSelectedConversation(prev => {
        if (!prev) return null;
        
        return {
          ...prev,
          ...data,
          mensagens: prev.mensagens || []
        };
      });
    }
  }, []);
  
  const processNewConversation = useCallback((data) => {
    if (!data || !data._id) return;

    refreshConversations({
      forceRefresh: true
    });
   
  }, [refreshConversations]);
  
  const processConversationFinalized = useCallback((data) => {
    if (!data || !data._id) return;
    
    const conversationId = data.conversaId || data._id;
    
    setConversations(prev => 
      prev.filter(c => (c.conversaId !== conversationId && c._id !== conversationId))
    );
    
    if (refs.selectedConversationId.current === conversationId) {
      setSelectedConversation(prev => prev ? {...prev, status: STATUS.FINALIZADA} : null);
    }
    
    refreshCompletedConversations({
      forceRefresh: true
    });
  }, [refreshCompletedConversations]);
  
  useEffect(() => {
    const handleNewMessage = (data) => processNewMessage(data);
    const handleConversationUpdated = (data) => processConversationUpdate(data);
    const handleNewConversation = (data) => processNewConversation(data);
    const handleConversationFinalized = (data) => processConversationFinalized(data);
    const handleTypingIndicator = (data) => processTypingIndicator(data);
    
    const unsubscribeNewMessage = socketService.on('nova_mensagem', handleNewMessage);
    const unsubscribeConversationUpdated = socketService.on('conversa_atualizada', handleConversationUpdated);
    const unsubscribeNewConversation = socketService.on('nova_conversa', handleNewConversation);
    const unsubscribeConversationFinalized = socketService.on('conversa_finalizada', handleConversationFinalized);
    const unsubscribeTypingIndicator = socketService.on('typing_indicator', handleTypingIndicator);
    
    return () => {
      unsubscribeNewMessage();
      unsubscribeConversationUpdated();
      unsubscribeNewConversation();
      unsubscribeConversationFinalized();
      unsubscribeTypingIndicator();
    };
  }, [processNewMessage, processConversationUpdate, processNewConversation, processConversationFinalized, processTypingIndicator]);
  
  const updateCurrentConversation = useCallback(async () => {
    const currentTime = Date.now();
    const timeSinceLastUpdate = currentTime - refs.lastUpdateTime.current;
    
    if (!refs.selectedConversationId.current) return;
    
    if (timeSinceLastUpdate >= 10000 && !refs.isRefreshing.current) {
      await refreshCurrentConversationFromApi();
    }
  }, []);
  
  const refreshCurrentConversationFromApi = useCallback(async () => {
    try {
      const conversationId = refs.selectedConversationId.current;
      if (!conversationId) return;
      
      refs.isRefreshing.current = true;
      const isAdminUser = userProfile?.role === 'admin' || isAdmin;
      const userId = multiflowApi.ADMIN_ID;
      
      console.log(`Atualizando conversa ${conversationId} a partir da API`);
      const response = await multiflowApi.getConversa(conversationId, userId, true, isAdminUser);
      
      if (response.success && response.data) {
        const enrichedConversation = await enrichConversationWithSectorData(response.data);
        updateSelectedConversationFromApi(enrichedConversation, conversationId);
      } else {
        console.error('Resposta da API sem sucesso:', response);
      }
      refs.lastUpdateTime.current = Date.now();
    } catch (error) {
      console.error('Erro ao atualizar conversa:', error);
    } finally {
      refs.isRefreshing.current = false;
    }
  }, [userProfile, isAdmin, enrichConversationWithSectorData]);
  
  const updateSelectedConversationFromApi = useCallback((conversationData, conversationId) => {
    const normalizedId = multiflowApi.normalizeId(conversationId, 'conversa');
    
    setSelectedConversation(prev => {
      if (!prev) return null;
      
      if (prev.conversaId !== normalizedId && prev._id !== normalizedId) {
        return prev;
      }
      
      return {
        ...prev,
        ...conversationData,
      };
    });
  }, []);
  
  useEffect(() => {
    if (refs.updateInterval.current) {
      clearInterval(refs.updateInterval.current);
    }
    
    refs.updateInterval.current = setInterval(updateCurrentConversation, 1000);
    
    return () => {
      if (refs.updateInterval.current) {
        clearInterval(refs.updateInterval.current);
        refs.updateInterval.current = null;
      }
    };
  }, [updateCurrentConversation]);
  
  useEffect(() => {
    if (selectedConversation) {
      const conversationId = selectedConversation.conversaId || selectedConversation._id;
      refs.selectedConversationId.current = conversationId;
      
      try {
        const isAdminUser = userProfile?.role === 'admin' || isAdmin;
        socketService.subscribeToConversation(conversationId, isAdminUser);
      } catch (error) {
        console.error("Erro ao inscrever-se na conversa:", error);
      }
    } else {
      refs.selectedConversationId.current = null;
    }
  }, [selectedConversation, userProfile, isAdmin]);
  
  useEffect(() => {
    return () => {
      clearAllRetryTimeouts();
    };
  }, []);
  
  useEffect(() => {
    if (toastNotification.show) {
      const timer = setTimeout(() => {
        closeToast();
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [toastNotification, closeToast]);
  
  const value = {
    isConnected,
    isLoading,
    conversations,
    completedConversations,
    selectedConversation,
    hasUnreadMessages,
    typingUsers,

    toastNotification,
    pagination,
    closeToast,
    handleToastClick,
    clearUnreadMessages,
    refreshConversations,
    refreshCompletedConversations,
    selectConversation,
    forceRefreshCurrentConversation,
    sendMessage,
    retryFailedMessage,
    sendTypingIndicator,
    transferConversation,
    finishConversation,
    archiveConversation,
    markMessagesAsRead,
    isAdmin: userProfile?.role === 'admin' || isAdmin,
    userProfile
  };
  
  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  
  if (!context) {
    throw new Error('useSocket deve ser usado dentro de um SocketProvider');
  }
  
  return context;
};