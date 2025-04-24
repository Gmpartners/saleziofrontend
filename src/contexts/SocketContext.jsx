// context/SocketContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import socketService from '../services/socket';
import { useAuthContext } from '../hooks/useAuthContext'; // Importação corrigida

const SocketContext = createContext(null);

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { currentUser } = useAuthContext(); // Agora usando o hook correto
  const [isConnected, setIsConnected] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  // Conectar ao WebSocket quando autenticado
  useEffect(() => {
    if (currentUser) {
      try {
        socketService.connect()
          .then(() => {
            setIsConnected(true);
            // Solicitar lista inicial de conversas
            socketService.requestConversationsList();
          })
          .catch(error => {
            console.error('Erro ao conectar WebSocket:', error);
          });
        
        // Configurar listeners para eventos do Socket.IO
        socketService
          .on('connect', () => {
            setIsConnected(true);
            // Solicitar lista inicial de conversas
            socketService.requestConversationsList();
          })
          .on('disconnect', () => {
            setIsConnected(false);
          })
          .on('conversas:lista', (data) => {
            setConversations(data);
          })
          .on('conversa:nova', (conversa) => {
            setConversations(prev => [conversa, ...prev]);
          })
          .on('mensagem:nova', (data) => {
            // Atualizar mensagens da conversa selecionada
            if (selectedConversation && selectedConversation._id === data.conversaId) {
              setSelectedConversation(prev => {
                if (!prev) return null;
                
                return {
                  ...prev,
                  mensagens: [...prev.mensagens, {
                    texto: data.texto,
                    tipo: data.tipo,
                    atendente: data.atendente,
                    criadoEm: data.criadoEm
                  }]
                };
              });
            }
            
            // Atualizar a lista de conversas
            setConversations(prev => 
              prev.map(conv => 
                conv._id === data.conversaId
                  ? { 
                      ...conv, 
                      ultimaMensagem: data.texto,
                      ultimaAtualizacao: data.criadoEm
                    }
                  : conv
              )
            );
          })
          .on('conversa:transferida', (data) => {
            // Atualizar a lista de conversas
            setConversations(prev => 
              prev.filter(conv => conv._id !== data.conversaId)
            );
            
            // Limpar seleção se a conversa transferida estava selecionada
            if (selectedConversation && selectedConversation._id === data.conversaId) {
              setSelectedConversation(null);
            }
          })
          .on('conversa:finalizada', (data) => {
            // Remover da lista de conversas ativas
            setConversations(prev => 
              prev.filter(conv => conv._id !== data.conversaId)
            );
            
            // Limpar seleção se a conversa finalizada estava selecionada
            if (selectedConversation && selectedConversation._id === data.conversaId) {
              setSelectedConversation(null);
            }
          })
          .on('usuario:online', (usuario) => {
            setOnlineUsers(prev => [...prev.filter(u => u.id !== usuario.id), usuario]);
          })
          .on('usuario:offline', (usuario) => {
            setOnlineUsers(prev => prev.filter(u => u.id !== usuario.id));
          });
      } catch (error) {
        console.error('Erro ao conectar ao WebSocket:', error);
      }
    }
    
    // Limpar na desmontagem
    return () => {
      if (socketService) {
        socketService.disconnect();
      }
    };
  }, [currentUser, selectedConversation]);

  // Selecionar conversa
  const selectConversation = async (conversationId) => {
    try {
      // Informar o servidor que estamos visualizando esta conversa
      socketService.selectConversation(conversationId);
      
      // Atualizar o estado com a conversa completa
      const conversation = conversations.find(conv => conv._id === conversationId);
      setSelectedConversation(conversation);
    } catch (error) {
      console.error('Erro ao selecionar conversa:', error);
    }
  };

  // Enviar mensagem
  const sendMessage = (conversationId, text) => {
    try {
      socketService.sendMessage(conversationId, text);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
    }
  };

  // Transferir conversa
  const transferConversation = (conversationId, sector) => {
    try {
      socketService.transferConversation(conversationId, sector);
    } catch (error) {
      console.error('Erro ao transferir conversa:', error);
    }
  };

  // Finalizar conversa
  const finishConversation = (conversationId) => {
    try {
      socketService.finishConversation(conversationId);
    } catch (error) {
      console.error('Erro ao finalizar conversa:', error);
    }
  };

  // Atualizar lista de conversas
  const refreshConversations = (filters = {}) => {
    try {
      socketService.requestConversationsList(filters);
    } catch (error) {
      console.error('Erro ao atualizar conversas:', error);
    }
  };

  const value = {
    isConnected,
    conversations,
    selectedConversation,
    onlineUsers,
    selectConversation,
    sendMessage,
    transferConversation,
    finishConversation,
    refreshConversations
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};