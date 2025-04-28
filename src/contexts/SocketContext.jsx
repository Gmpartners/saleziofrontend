import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { socketService } from '../services/socket';
import { multiflowApi } from '../services/multiflowApi';
import { notificationService } from '../services/notificationService';
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
  const [completedConversations, setCompletedConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Usar uma ref para rastrear a conversa selecionada sem causar re-renders
  const selectedConversationIdRef = useRef(null);
  
  // Ref para rastrear o foco da aplicação
  const appFocusedRef = useRef(document.hasFocus());
  const lastUpdateTimestampRef = useRef(Date.now());
  
  // Referência para controlar as requisições
  const isRefreshingRef = useRef(false);
  const shouldRefreshRef = useRef(false);
  const isRefreshingCompletedRef = useRef(false);
  
  // Indicador de inicialização
  const isInitializedRef = useRef(false);
  
  // URL do servidor WebSocket
  const socketURL = import.meta.env.VITE_SOCKET_URL || 'https://multi.compracomsegurancaeconfianca.com';

  // Detectar quando a aplicação ganha ou perde foco
  useEffect(() => {
    const handleFocus = () => {
      console.log('Aplicação ganhou foco');
      appFocusedRef.current = true;
      // Recarregar dados quando o app ganhar foco após um período sem atualizações
      const now = Date.now();
      if (now - lastUpdateTimestampRef.current > 300000) { // 5 minutos
        shouldRefreshRef.current = true;
        triggerRefresh();
      }
      // Limpar indicador de mensagens não lidas
      setHasUnreadMessages(false);
      
      // Restaurar título original da página
      document.title = document.title.split(' • ')[0] || 'Dashboard';
    };
    
    const handleBlur = () => {
      console.log('Aplicação perdeu foco');
      appFocusedRef.current = false;
    };
    
    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);
    
    // Pré-carregar sons de notificação
    notificationService.preloadSounds();
    
    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, []);

  // Função para disparar atualização se necessário
  const triggerRefresh = useCallback(() => {
    if (shouldRefreshRef.current && !isRefreshingRef.current) {
      console.log('Disparando atualização de conversas...');
      shouldRefreshRef.current = false;
      refreshConversations();
    }
  }, []);

  // Verificar periodicamente o status da conexão (sem buscar dados)
  useEffect(() => {
    // Função para verificar e atualizar o status
    const checkConnectionStatus = () => {
      const connected = socketService.isConnected();
      if (connected !== isConnected) {
        console.log(`Status da conexão alterado: ${connected ? 'Conectado' : 'Desconectado'}`);
        setIsConnected(connected);
        
        // Tentar recarregar conversas apenas quando reconectar após um período de desconexão
        if (connected && !isConnected) {
          const now = Date.now();
          if (now - lastUpdateTimestampRef.current > 300000) { // 5 minutos
            shouldRefreshRef.current = true;
            triggerRefresh();
          }
        }
      }
    };

    // Verificar imediatamente
    checkConnectionStatus();
    
    // Configurar verificação periódica do status de conexão a cada 30 segundos
    const intervalId = setInterval(checkConnectionStatus, 30000);
    
    return () => clearInterval(intervalId);
  }, [isConnected, triggerRefresh]);

  // Configurar conexão e listeners do WebSocket
  useEffect(() => {
    if (!user || !userProfile) return;
    
    // Se já foi inicializado, evitar reinicialização
    if (isInitializedRef.current) return;
    
    isInitializedRef.current = true;
    console.log('Inicializando SocketContext...');

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
          
          // Fazer apenas a primeira carga de dados ao conectar
          if (conversations.length === 0) {
            shouldRefreshRef.current = true;
            triggerRefresh();
          }
        }),
        
        // Evento de desconexão
        socketService.on('disconnect', () => {
          console.log("Socket desconectado");
          setIsConnected(false);
          
          // Notificar usuário sobre desconexão
          if (connectionError !== 'disconnected') {
            setConnectionError('disconnected');
            // Notificar com serviço de notificações
            notificationService.notifyError({
              message: 'Conexão perdida. Reconectando...'
            });
          }
        }),
        
        // Nova conversa
        socketService.on(MultiFlowEventosMap.NOVA_CONVERSA, (data) => {
          console.log('Nova conversa:', data);
          
          // Atualizar timestamp da última atualização
          lastUpdateTimestampRef.current = Date.now();
          
          // Adicionar nova conversa ao início da lista
          if (data.conversa) {
            setConversations(prev => {
              // Verificar se a conversa já existe
              const exists = prev.some(c => c._id === data.conversa._id);
              if (!exists) {
                // Reproduzir som e notificação visual
                notificationService.notifyNewConversation(data.conversa);
                // Indicar que há mensagens não lidas se a aplicação não estiver em foco
                if (!appFocusedRef.current) {
                  setHasUnreadMessages(true);
                }
                
                // Adicionar contador de mensagens não lidas para a nova conversa
                const conversaWithUnreadCount = {
                  ...data.conversa,
                  unreadCount: 1,
                  lastMessageRead: false
                };
                
                // Adicionar ao início da lista
                return [conversaWithUnreadCount, ...prev];
              }
              return prev;
            });
          }
        }),
        
        // Nova mensagem
        socketService.on(MultiFlowEventosMap.NOVA_MENSAGEM, (data) => {
          console.log('Nova mensagem recebida:', data);
          
          // Atualizar timestamp da última atualização
          lastUpdateTimestampRef.current = Date.now();
          
          // Verificar se é da conversa atual
          const isCurrentConversation = selectedConversationIdRef.current === data.conversaId;
          
          // Reproduzir som e enviar notificação
          notificationService.notifyNewMessage(data.mensagem, isCurrentConversation);
          
          // Indicar que há mensagens não lidas se a aplicação não estiver em foco
          if (!appFocusedRef.current) {
            setHasUnreadMessages(true);
          }
          
          // Atualizar mensagens da conversa selecionada em tempo real
          if (isCurrentConversation) {
            setSelectedConversation(prev => {
              if (!prev) return null;
              
              // Verificar se a mensagem já existe na conversa
              const mensagemJaExiste = prev.mensagens && prev.mensagens.some(msg => 
                (msg._id && msg._id === data.mensagem._id) || 
                (msg.conteudo === data.mensagem.conteudo && 
                 msg.timestamp === data.mensagem.timestamp)
              );
              
              if (!mensagemJaExiste) {
                console.log('Adicionando nova mensagem à conversa selecionada');
                return {
                  ...prev,
                  mensagens: [...(prev.mensagens || []), data.mensagem],
                  ultimaAtividade: data.mensagem.timestamp || new Date().toISOString(),
                  ultimaMensagem: data.mensagem.conteudo,
                  lastMessageRead: appFocusedRef.current // Marcar como lida se estiver em foco
                };
              }
              
              return prev;
            });
          }
          
          // Atualizar a lista de conversas
          setConversations(prev => 
            prev.map(conv => {
              if (conv._id === data.conversaId) {
                // Se for a conversa selecionada e o app estiver em foco, não incrementar contador
                const shouldIncrementUnread = !isCurrentConversation || !appFocusedRef.current;
                return { 
                  ...conv, 
                  ultimaMensagem: data.mensagem.conteudo,
                  ultimaAtividade: data.mensagem.timestamp || new Date().toISOString(),
                  unreadCount: shouldIncrementUnread ? (conv.unreadCount || 0) + 1 : conv.unreadCount || 0,
                  lastMessageRead: isCurrentConversation && appFocusedRef.current
                };
              }
              return conv;
            })
          );
        }),
        
        // Conversa atualizada
        socketService.on(MultiFlowEventosMap.CONVERSA_ATUALIZADA, (data) => {
          console.log('Conversa atualizada:', data);
          
          // Atualizar timestamp da última atualização
          lastUpdateTimestampRef.current = Date.now();
          
          // Verificar se é a conversa atual
          const isCurrentConversation = selectedConversationIdRef.current === data?.conversa?._id;
          
          // Notificar sobre atualização
          if (data.conversa) {
            notificationService.notifyConversationUpdate(data.conversa, isCurrentConversation);
          }
          
          // Atualizar a conversa na lista
          if (data.conversa) {
            // Se a conversa foi finalizada, mover para a lista de concluídas
            if (data.conversa.status === MultiFlowStatusMap.FINALIZADA) {
              // Remover da lista de conversas ativas
              setConversations(prev => 
                prev.filter(c => c._id !== data.conversa._id)
              );
              
              // Adicionar à lista de conversas concluídas
              setCompletedConversations(prev => {
                // Verificar se já existe
                if (!prev.some(c => c._id === data.conversa._id)) {
                  return [data.conversa, ...prev];
                }
                return prev;
              });
            } else {
              // Atualizar na lista de conversas ativas
              setConversations(prev => {
                // Verificar se a conversa já existe
                const exists = prev.some(c => c._id === data.conversa._id);
                if (exists) {
                  // Preservar contador de mensagens não lidas
                  return prev.map(conv => {
                    if (conv._id === data.conversa._id) {
                      return {
                        ...data.conversa,
                        unreadCount: conv.unreadCount || 0,
                        lastMessageRead: conv.lastMessageRead
                      };
                    }
                    return conv;
                  });
                } else {
                  // Adicionar nova conversa ao início da lista
                  return [{
                    ...data.conversa,
                    unreadCount: 0,
                    lastMessageRead: true
                  }, ...prev];
                }
              });
            }
            
            // Atualizar a conversa selecionada se for a mesma
            if (isCurrentConversation) {
              if (data.conversa.status === MultiFlowStatusMap.FINALIZADA) {
                // Se a conversa foi finalizada e era a selecionada, limpar seleção
                setSelectedConversation(null);
                selectedConversationIdRef.current = null;
              } else {
                setSelectedConversation(prev => ({
                  ...prev,
                  ...data.conversa,
                  // Preservar mensagens se elas não vierem na atualização
                  mensagens: data.conversa.mensagens || prev?.mensagens || []
                }));
              }
            }
          }
        }),
        
        // Errors
        socketService.on('error', (error) => {
          console.error('Erro no socket:', error);
          notificationService.notifyError({
            message: `Erro de conexão: ${error.message || 'Desconhecido'}`
          });
        })
      ];
      
      // Verificar conexão e atualizar estado
      setIsConnected(socketService.isConnected());
      
      // Carregar lista inicial de conversas (apenas na primeira vez)
      shouldRefreshRef.current = true;
      triggerRefresh();
      
      // Limpar ao desmontar
      return () => {
        removeListeners.forEach(removeListener => {
          if (typeof removeListener === 'function') {
            removeListener();
          }
        });
        
        // Desconectar o socket
        socketService.disconnect();
        isInitializedRef.current = false;
      };
    } catch (error) {
      console.error('Erro ao inicializar socket:', error);
      setConnectionError(`Falha ao conectar: ${error.message}`);
      
      // Notificar usuário sobre erro de conexão
      notificationService.notifyError({
        message: `Erro de conexão: ${error.message}`
      });
      
      // Carregar conversas usando a API REST como fallback
      shouldRefreshRef.current = true;
      triggerRefresh();
      
      return () => {
        // Garantir que o socket seja desconectado se houver erro
        socketService.disconnect();
        isInitializedRef.current = false;
      };
    }
  }, [user, userProfile, socketURL, conversations.length, triggerRefresh]);

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
      console.log(`Selecionando conversa: ${conversationId}`);
      
      // Se já tivermos a conversa em cache e ela tiver mensagens, usar cache temporariamente
      // enquanto buscamos dados atualizados em segundo plano
      const cachedConversation = conversations.find(conv => conv._id === conversationId) || 
                                completedConversations.find(conv => conv._id === conversationId);
      
      if (cachedConversation) {
        // Atualizar imediatamente para melhor UX
        setSelectedConversation(cachedConversation);
        selectedConversationIdRef.current = conversationId;
        
        // Zerar contador de mensagens não lidas para esta conversa
        if (cachedConversation.unreadCount > 0) {
          // Atualizar na lista de conversas
          setConversations(prev => 
            prev.map(conv => 
              conv._id === conversationId
                ? { ...conv, unreadCount: 0, lastMessageRead: true }
                : conv
            )
          );
        }
      }
      
      // Buscar detalhes da conversa pela API
      const userId = userProfile?.id || user?.uid;
      const response = await multiflowApi.api.get(
        `/users/${userId}/conversas/${conversationId}`
      );
      
      if (response.data && response.data.success && response.data.data) {
        console.log('Detalhes da conversa recebidos do servidor:', response.data.data);
        
        // Garantir que a conversa tem um array de mensagens
        const updatedConversation = {
          ...response.data.data,
          mensagens: response.data.data.mensagens || [],
          unreadCount: 0, // Zerar contador ao selecionar
          lastMessageRead: true // Marcar última mensagem como lida
        };
        
        // Atualizar o estado com a conversa completa
        setSelectedConversation(updatedConversation);
        selectedConversationIdRef.current = conversationId;
        
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
          
          // Atualizar localmente sem precisar recarregar
          setSelectedConversation(prev => ({
            ...prev,
            status: MultiFlowStatusMap.EM_ANDAMENTO
          }));
          
          // Atualizar na lista de conversas
          setConversations(prev => 
            prev.map(conv => 
              conv._id === conversationId
                ? { 
                    ...conv, 
                    status: MultiFlowStatusMap.EM_ANDAMENTO,
                    unreadCount: 0,
                    lastMessageRead: true
                  }
                : conv
            )
          );
        }
        
        return updatedConversation;
      } else {
        console.error('Erro ao obter detalhes da conversa:', response.data);
        return cachedConversation || null;
      }
    } catch (error) {
      console.error('Erro ao selecionar conversa:', error);
      
      // Retornar versão em cache se disponível
      return conversations.find(conv => conv._id === conversationId) || 
             completedConversations.find(conv => conv._id === conversationId) || 
             null;
    }
  }, [user, userProfile, conversations, completedConversations]);

  // Enviar mensagem em uma conversa
  const sendMessage = useCallback(async (conversationId, text) => {
    try {
      console.log(`Enviando mensagem para conversa ${conversationId}:`, text);
      
      // Otimista: adicionar mensagem localmente antes da confirmação do servidor
      const optimisticMessage = {
        _id: `temp-${Date.now()}`,
        conversaId: conversationId,
        conteudo: text,
        remetente: 'atendente',
        timestamp: new Date().toISOString(),
        status: 'sending',
        createdAt: new Date().toISOString()
      };
      
      // Adicionar à conversa atual se for a mesma
      if (selectedConversationIdRef.current === conversationId) {
        setSelectedConversation(prev => {
          if (!prev) return null;
          
          const updatedMessages = [...(prev.mensagens || []), optimisticMessage];
          console.log('Atualizando mensagens da conversa selecionada', updatedMessages);
          
          return {
            ...prev,
            mensagens: updatedMessages,
            ultimaAtividade: optimisticMessage.timestamp,
            ultimaMensagem: text,
            lastMessageRead: true
          };
        });
      }
      
      // Atualizar temporariamente na lista de conversas
      setConversations(prev => 
        prev.map(conv => 
          conv._id === conversationId
            ? { 
                ...conv, 
                ultimaMensagem: text,
                ultimaAtividade: optimisticMessage.timestamp,
                lastMessageRead: true
              }
            : conv
        )
      );
      
      // Enviar para o servidor
      const response = await multiflowApi.enviarMensagem(conversationId, text);
      
      if (response.success) {
        console.log('Mensagem enviada com sucesso:', response.data);
        
        // Atualizar timestamp da última atualização
        lastUpdateTimestampRef.current = Date.now();
        
        // Atualizar mensagem temporária com dados reais
        if (selectedConversationIdRef.current === conversationId) {
          setSelectedConversation(prev => {
            if (!prev) return null;
            
            // Atualizar mensagem com ID real
            const updatedMessages = prev.mensagens.map(msg => 
              msg._id === optimisticMessage._id ? 
                { 
                  ...msg, 
                  _id: response.data?.mensagemId || msg._id, 
                  status: 'sent' 
                } : 
                msg
            );
            
            return {
              ...prev,
              mensagens: updatedMessages
            };
          });
        }
        
        // Notificar sobre envio bem-sucedido
        notificationService.showToast('Mensagem enviada com sucesso', 'success');
        
        return true;
      } else {
        console.error('Falha ao enviar mensagem:', response.error);
        
        // Marcar mensagem como falha
        if (selectedConversationIdRef.current === conversationId) {
          setSelectedConversation(prev => {
            if (!prev) return null;
            
            return {
              ...prev,
              mensagens: prev.mensagens.map(msg => 
                msg._id === optimisticMessage._id ? 
                  { ...msg, status: 'failed' } : 
                  msg
              )
            };
          });
        }
        
        // Notificar erro
        notificationService.notifyError({
          message: 'Falha ao enviar mensagem. Tente novamente.'
        });
        
        return false;
      }
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      
      // Marcar mensagem como falha
      if (selectedConversationIdRef.current === conversationId) {
        setSelectedConversation(prev => {
          if (!prev) return null;
          
          return {
            ...prev,
            mensagens: prev.mensagens.map(msg => 
              msg._id.startsWith('temp-') ? 
                { ...msg, status: 'failed' } : 
                msg
            )
          };
        });
      }
      
      // Notificar erro
      notificationService.notifyError({
        message: 'Erro ao enviar mensagem. Tente novamente.'
      });
      
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
        
        // Se for uma transferência para fora do setor atual, removê-la da lista
        if (userProfile?.setor && userProfile.role !== 'admin') {
          const userSectorId = userProfile.setor._id || userProfile.setor.id;
          if (sectorId !== userSectorId) {
            setConversations(prev => 
              prev.filter(conv => conv._id !== conversationId)
            );
          }
        }
      }
      
      return response.success;
    } catch (error) {
      console.error('Erro ao transferir conversa:', error);
      
      // Notificar erro
      notificationService.notifyError({
        message: 'Erro ao transferir conversa. Tente novamente.'
      });
      
      return false;
    }
  }, [userProfile]);

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
        
        // Mover conversa para a lista de concluídas
        const conversationToMove = conversations.find(conv => conv._id === conversationId);
        if (conversationToMove) {
          // Adicionar à lista de concluídas
          setCompletedConversations(prev => [
            { ...conversationToMove, status: MultiFlowStatusMap.FINALIZADA },
            ...prev
          ]);
          
          // Remover da lista ativa
          setConversations(prev => 
            prev.filter(conv => conv._id !== conversationId)
          );
        }
        
        return true;
      } else {
        console.error('Erro ao finalizar conversa:', response);
        
        // Notificar erro
        notificationService.notifyError({
          message: 'Erro ao finalizar conversa. Tente novamente.'
        });
        
        return false;
      }
    } catch (error) {
      console.error(`Erro ao finalizar conversa ${conversationId}:`, error);
      
      // Notificar erro
      notificationService.notifyError({
        message: 'Erro ao finalizar conversa. Tente novamente.'
      });
      
      return false;
    }
  }, [conversations]);

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
        
        // Atualizar as listas de conversas
        setConversations(prev => 
          prev.filter(conv => conv._id !== conversationId)
        );
        
        setCompletedConversations(prev => 
          prev.filter(conv => conv._id !== conversationId)
        );
        
        return true;
      } else {
        console.error('Erro ao arquivar conversa:', response);
        
        // Notificar erro
        notificationService.notifyError({
          message: 'Erro ao arquivar conversa. Tente novamente.'
        });
        
        return false;
      }
    } catch (error) {
      console.error(`Erro ao arquivar conversa ${conversationId}:`, error);
      
      // Notificar erro
      notificationService.notifyError({
        message: 'Erro ao arquivar conversa. Tente novamente.'
      });
      
      return false;
    }
  }, []);

  // Atualizar lista de conversas
  const refreshConversations = useCallback(async (filters = {}) => {
    // Evitar atualizações desnecessárias
    if (isRefreshingRef.current) {
      console.log('Já existe uma atualização em andamento, ignorando');
      return false;
    }
    
    // Marcar como atualizando
    isRefreshingRef.current = true;
    setIsLoading(true);
    console.log('Atualizando lista de conversas com filtros:', filters);
    
    try {
      // Usar a API REST para buscar conversas
      const defaultFilters = {
        status: [MultiFlowStatusMap.AGUARDANDO, MultiFlowStatusMap.EM_ANDAMENTO],
        page: 1,
        limit: 50
      };
      
      // Mesclar filtros padrão com filtros fornecidos
      const mergedFilters = { ...defaultFilters, ...filters };
      
      const response = await multiflowApi.getConversas(mergedFilters);
      
      if (response.success && Array.isArray(response.data)) {
        console.log("Conversas obtidas:", response.data.length);
        
        // Atualizar timestamp da última atualização
        lastUpdateTimestampRef.current = Date.now();
        
        // Preparar conversas com informações de leitura
        const conversasComStatus = response.data.map(conversa => {
          // Preservar status de leitura se já existe
          const existingConv = conversations.find(c => c._id === conversa._id);
          return {
            ...conversa,
            unreadCount: existingConv?.unreadCount || 0,
            lastMessageRead: existingConv?.lastMessageRead !== undefined ? existingConv.lastMessageRead : true
          };
        });
        
        // Preservar a ordem das conversas já existentes
        if (conversations.length > 0 && conversasComStatus.length > 0) {
          // Mapear conversas existentes para preservar ordem
          const existingIds = new Set(conversations.map(c => c._id));
          const newConversations = conversasComStatus.filter(c => !existingIds.has(c._id));
          
          // Atualizar conversas existentes mantendo a ordem
          const updatedExistingConversations = conversations
            .map(existingConv => {
              const updated = conversasComStatus.find(c => c._id === existingConv._id);
              return updated || existingConv;
            })
            .filter(c => conversasComStatus.some(newC => newC._id === c._id)); // Manter apenas as que ainda existem
          
          // Adicionar novas conversas no início
          setConversations([...newConversations, ...updatedExistingConversations]);
        } else {
          setConversations(conversasComStatus);
        }
      } else {
        console.warn('Falha ao buscar conversas:', response);
        // Mesmo sem sucesso, tente manter as conversas já carregadas
        if (response.data && Array.isArray(response.data) && response.data.length > 0) {
          setConversations(response.data);
        }
        
        // Notificar erro
        if (!response.success) {
          notificationService.notifyError({
            message: 'Erro ao atualizar conversas. Tente novamente manualmente.'
          });
        }
      }
      
      return response.success;
    } catch (error) {
      console.error('Erro ao atualizar conversas:', error);
      
      // Notificar erro
      notificationService.notifyError({
        message: 'Erro ao atualizar conversas. Tente novamente manualmente.'
      });
      
      return false;
    } finally {
      // Desmarcar como atualizando após um breve delay
      // para evitar múltiplas chamadas em sequência
      setTimeout(() => {
        isRefreshingRef.current = false;
        setIsLoading(false);
      }, 1000);
    }
  }, [conversations]);

  // Buscar conversas concluídas
  const refreshCompletedConversations = useCallback(async () => {
    // Evitar atualizações desnecessárias
    if (isRefreshingCompletedRef.current) {
      console.log('Já existe uma atualização de conversas concluídas em andamento, ignorando');
      return false;
    }
    
    // Marcar como atualizando
    isRefreshingCompletedRef.current = true;
    console.log('Buscando conversas concluídas...');
    
    try {
      // Filtros para buscar apenas conversas finalizadas
      const filters = {
        status: [MultiFlowStatusMap.FINALIZADA],
        page: 1,
        limit: 50
      };
      
      const response = await multiflowApi.getConversas(filters);
      
      if (response.success && Array.isArray(response.data)) {
        console.log("Conversas concluídas obtidas:", response.data.length);
        
        // Ordenar por última atividade (mais recentes primeiro)
        const sortedCompletedConversations = [...response.data].sort((a, b) => {
          const aTime = new Date(a.ultimaAtividade || a.criadoEm || 0).getTime();
          const bTime = new Date(b.ultimaAtividade || b.criadoEm || 0).getTime();
          return bTime - aTime;
        });
        
        setCompletedConversations(sortedCompletedConversations);
      } else {
        console.warn('Falha ao buscar conversas concluídas:', response);
        
        // Notificar erro
        if (!response.success) {
          notificationService.notifyError({
            message: 'Erro ao carregar conversas concluídas. Tente novamente.'
          });
        }
      }
      
      return response.success;
    } catch (error) {
      console.error('Erro ao buscar conversas concluídas:', error);
      
      // Notificar erro
      notificationService.notifyError({
        message: 'Erro ao carregar conversas concluídas. Tente novamente.'
      });
      
      return false;
    } finally {
      // Desmarcar como atualizando após um breve delay
      setTimeout(() => {
        isRefreshingCompletedRef.current = false;
      }, 1000);
    }
  }, []);

  // Função para reenviar mensagens com falha
  const retryFailedMessage = useCallback(async (conversationId, messageId, text) => {
    try {
      console.log(`Reenviando mensagem: ${messageId} para conversa: ${conversationId}`);
      
      // Remover mensagem com falha
      if (selectedConversationIdRef.current === conversationId) {
        setSelectedConversation(prev => {
          if (!prev) return null;
          
          return {
            ...prev,
            mensagens: prev.mensagens.filter(msg => msg._id !== messageId)
          };
        });
      }
      
      // Enviar novamente
      return await sendMessage(conversationId, text);
    } catch (error) {
      console.error('Erro ao reenviar mensagem:', error);
      return false;
    }
  }, [sendMessage]);

  // Limpar flag de mensagens não lidas
  const clearUnreadMessages = useCallback(() => {
    setHasUnreadMessages(false);
    
    // Limpar indicadores visuais na interface
    document.title = document.title.split(' • ')[0] || 'Dashboard';
  }, []);
  
  // Testar recebimento de mensagens
  const testReceiveMessage = useCallback((conversationId, text = "Mensagem de teste simulada") => {
    if (!conversationId) {
      console.error('ID da conversa obrigatório para testar recebimento de mensagem');
      return;
    }
    
    console.log(`Simulando recebimento de mensagem na conversa ${conversationId}`);
    const mockMessage = socketService.simulateNewMessage(conversationId, text);
    return mockMessage;
  }, []);

  // Valores expostos pelo contexto
  const value = {
    isConnected,
    connectionError,
    conversations,
    completedConversations,
    selectedConversation,
    hasUnreadMessages,
    isLoading,
    selectConversation,
    sendMessage,
    transferConversation,
    finishConversation,
    archiveConversation,
    refreshConversations,
    refreshCompletedConversations,
    retryFailedMessage,
    clearUnreadMessages,
    testReceiveMessage, // Função para testar recebimento
    // Serviços
    api: multiflowApi,
    socketService,
    notificationService
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};