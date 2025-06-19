import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { notificationService } from '../services/notificationService';

const SocketContextProvider = ({ children }) => {
  const { 
    isConnected, 
    refreshConversations, 
    forceRefreshCurrentConversation,
    selectedConversation,
    hasUnreadMessages,
    clearUnreadMessages
  } = useSocket();
  
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());
  const refreshTimeoutRef = useRef(null);
  const refreshIntervalRef = useRef(null);
  const lastSelectedConversationRef = useRef(null);
  
  useEffect(() => {
    if (hasUnreadMessages) {
      clearUnreadMessages();
    }
  }, [hasUnreadMessages, clearUnreadMessages]);
  
  useEffect(() => {
    const setupPeriodicRefresh = () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      
      refreshIntervalRef.current = setInterval(() => {
        const now = Date.now();
        
        if (now - lastRefreshTime < 15000) {
          return;
        }
        
        setLastRefreshTime(now);
        
        if (!isConnected) {
          return;
        }
        
        if (selectedConversation && selectedConversation._id) {
          forceRefreshCurrentConversation()
            .catch(err => console.error('Erro ao atualizar conversa atual:', err));
        }
        
        if (now - lastRefreshTime > 120000) {
          refreshConversations({})
            .catch(err => console.error('Erro ao atualizar lista de conversas:', err));
        }
      }, 30000);
    };
    
    setupPeriodicRefresh();
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, [isConnected, lastRefreshTime, forceRefreshCurrentConversation, refreshConversations, selectedConversation]);
  
  useEffect(() => {
    if (selectedConversation && selectedConversation._id !== lastSelectedConversationRef.current) {
      lastSelectedConversationRef.current = selectedConversation._id;
      
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
      
      refreshTimeoutRef.current = setTimeout(() => {
        if (isConnected && selectedConversation && selectedConversation._id) {
          forceRefreshCurrentConversation()
            .catch(err => console.error('Erro ao atualizar conversa após seleção:', err));
        }
      }, 2000);
    }
  }, [selectedConversation, isConnected, forceRefreshCurrentConversation]);
  
  useEffect(() => {
    if (isConnected) {
      notificationService.showToast('Conexão restabelecida', 'success');
      
      setTimeout(() => {
        if (selectedConversation && selectedConversation._id) {
          forceRefreshCurrentConversation()
            .catch(err => console.error('Erro ao atualizar conversa após reconexão:', err));
        }
        
        refreshConversations({})
          .catch(err => console.error('Erro ao atualizar conversas após reconexão:', err));
          
        setLastRefreshTime(Date.now());
      }, 2000);
    }
  }, [isConnected, refreshConversations, forceRefreshCurrentConversation, selectedConversation]);
  
  return children;
};

export default SocketContextProvider;