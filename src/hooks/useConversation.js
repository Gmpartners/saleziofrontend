import { useState, useEffect, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { multiflowApi } from '../services/multiflowApi';

export function useConversation(conversationId) {
  const { 
    selectedConversation,
    selectConversation,
    sendMessage,
    sendTypingIndicator,
    markMessagesAsRead,
    retryFailedMessage,
    transferConversation,
    finishConversation,
    archiveConversation,
    refreshConversations,
    refreshCompletedConversations,
    isConnected,
    typingUsers,
  } = useSocket();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSending, setIsSending] = useState(false);
  
  useEffect(() => {
    if (!conversationId) {
      setLoading(false);
      return;
    }
    
    const loadConversation = async () => {
      setLoading(true);
      setError(null);
      
      try {
        await selectConversation(conversationId);
      } catch (err) {
        setError(err.message || 'Erro ao carregar conversa');
      } finally {
        setLoading(false);
      }
    };
    
    loadConversation();
    
    return () => {
    };
  }, [conversationId, selectConversation]);
  
  const handleSendMessage = useCallback(async (id, content) => {
    if (!id || !content) {
      throw new Error('ID da conversa e conteúdo são obrigatórios');
    }
    
    setIsSending(true);
    
    try {
      const result = await sendMessage(id, content);
      return result;
    } finally {
      setIsSending(false);
    }
  }, [sendMessage]);
  
  const handleMarkAsRead = useCallback((id) => {
    if (!id) return;
    markMessagesAsRead(id);
  }, [markMessagesAsRead]);
  
  const handleTransferConversation = useCallback(async (conversationId, sectorId, motivo = '') => {
    if (!conversationId || !sectorId) {
      throw new Error('ID da conversa e do setor são obrigatórios');
    }
    
    try {
      const result = await multiflowApi.transferirConversa(conversationId, sectorId, undefined, motivo);
      return result.success;
    } catch (error) {
      console.error('Erro ao transferir conversa:', error);
      throw error;
    }
  }, []);
  
  const handleFinishConversation = useCallback(async (conversationId) => {
    if (!conversationId) {
      throw new Error('ID da conversa é obrigatório');
    }
    
    try {
      const result = await finishConversation(conversationId);
      return result;
    } catch (error) {
      console.error('Erro ao finalizar conversa:', error);
      throw error;
    }
  }, [finishConversation]);
  
  const handleArchiveConversation = useCallback(async (conversationId) => {
    if (!conversationId) {
      throw new Error('ID da conversa é obrigatório');
    }
    
    try {
      const result = await archiveConversation(conversationId);
      return result;
    } catch (error) {
      console.error('Erro ao arquivar conversa:', error);
      throw error;
    }
  }, [archiveConversation]);
  
  const handleRetryMessage = useCallback((conversationId, messageId, content) => {
    if (!conversationId || !messageId || !content) return;
    return retryFailedMessage(conversationId, messageId, content);
  }, [retryFailedMessage]);

  return {
    selectedConversation,
    selectConversation,
    sendMessage: handleSendMessage,
    sendTypingIndicator,
    markAsRead: handleMarkAsRead,
    retryFailedMessage: handleRetryMessage,
    transferConversation: handleTransferConversation,
    finishConversation: handleFinishConversation,
    archiveConversation: handleArchiveConversation,
    refreshConversations,
    refreshCompletedConversations,
    loading,
    error,
    isSending,
    isConnected,
    typingUsers
  };
}