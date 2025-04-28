import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { realtimeService } from '../services/realtimeService';
import { multiflowApi } from '../services/multiflowApi';
import { notificationService } from '../services/notificationService';
import { useAuthContext } from '../hooks/useAuthContext';

// Mapeamento de eventos da API MultiFlow
export const MultiFlowEventosMap = {
  NOVA_CONVERSA: 'nova_conversa',
  NOVA_MENSAGEM: 'nova_mensagem',
  CONVERSA_ATUALIZADA: 'conversa_atualizada',
  DIGITANDO: 'typing',
  MENSAGEM_LIDA: 'message_read'
};

// Mapeamento de status da API MultiFlow
export const MultiFlowStatusMap = {
  AGUARDANDO: 'aguardando',
  EM_ANDAMENTO: 'em_andamento',
  FINALIZADA: 'finalizada'
};

// Criar contexto para comunicação em tempo real
export const SocketContext = createContext(null);

// Hook para acessar o contexto
export const useSocket = () => useContext(SocketContext);

// Variável para rastrear estado global entre renderizações
const globalState = {
  isInitialized: false,
  lastConversationUpdate: {},
  manualRefreshInProgress: false
};

export const SocketProvider = ({ children }) => {
  const { user, userProfile } = useAuthContext();
  const [isConnected, setIsConnected] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [completedConversations, setCompletedConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [connectionError, setConnectionError] = useState(null);
  const [hasUnreadMessages, setHasUnreadMessages] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  
  // Refs para otimização
  const selectedConversationIdRef = useRef(null);
  const appFocusedRef = useRef(document.hasFocus());
  const lastUpdateTimestampRef = useRef(Date.now());
  const isRefreshingRef = useRef(false);
  const shouldRefreshRef = useRef(false);
  const isRefreshingCompletedRef = useRef(false);
  const optimisticMessagesRef = useRef(new Map());
  const debounceTypingRef = useRef(null);
  
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
      
      // Marcar mensagens como lidas se estiver na conversa ativa
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

  // Função para forçar o recarregamento da conversa atual
  const forceRefreshCurrentConversation = useCallback(async () => {
    // Evitar múltiplas chamadas simultâneas
    if (globalState.manualRefreshInProgress) {
      console.log('⚠️ Atualização já em andamento, ignorando chamada');
      return null;
    }
    
    if (!selectedConversationIdRef.current || !user || !userProfile) {
      console.log('⚠️ Sem conversa selecionada ou usuário não logado');
      return null;
    }
    
    const conversationId = selectedConversationIdRef.current;
    
    // Verificar se a conversa foi atualizada recentemente (nos últimos 10 segundos)
    const now = Date.now();
    const lastUpdate = globalState.lastConversationUpdate[conversationId] || 0;
    if (now - lastUpdate < 10000) { // 10 segundos
      console.log('⚠️ Conversa atualizada recentemente, ignorando');
      return selectedConversation;
    }
    
    globalState.manualRefreshInProgress = true;
    console.log('🔄 Forçando atualização da conversa atual:', conversationId);
    
    try {
      const userId = userProfile?.id || user?.uid;
      
      // Buscar detalhes atualizados da conversa pela API
      const response = await multiflowApi.api.get(
        `/users/${userId}/conversas/${conversationId}`
      );
      
      if (response.data && response.data.success && response.data.data) {
        console.log('📥 Detalhes atualizados da conversa recebidos do servidor');
        
        // Registrar timestamp da atualização
        globalState.lastConversationUpdate[conversationId] = now;
        
        // Garantir que a conversa tem um array de mensagens
        const updatedConversation = {
          ...response.data.data,
          mensagens: response.data.data.mensagens || [],
          unreadCount: 0, // Zerar contador ao atualizar
          lastMessageRead: true // Marcar última mensagem como lida
        };
        
        // Atualizar o estado com a conversa atualizada
        setSelectedConversation(updatedConversation);
        
        // Também atualizar na lista geral de conversas
        setConversations(prev => 
          prev.map(conv => 
            conv._id === conversationId
              ? { ...conv, ...updatedConversation, unreadCount: 0, lastMessageRead: true }
              : conv
          )
        );
        
        return updatedConversation;
      }
      return null;
    } catch (error) {
      console.error('Erro ao atualizar conversa atual:', error);
      return null;
    } finally {
      // Sempre limpar o flag ao finalizar
      globalState.manualRefreshInProgress = false;
    }
  }, [user, userProfile, selectedConversation]);

  // Verificar periodicamente o status da conexão
  useEffect(() => {
    // Função para verificar e atualizar o status
    const checkConnectionStatus = () => {
      const connected = realtimeService.isConnected();
      const connectionState = realtimeService.getConnectionState();
      
      if (connected !== isConnected) {
        console.log(`Status da conexão alterado: ${connected ? 'Conectado' : 'Desconectado'} (${connectionState})`);
        setIsConnected(connected);
        
        // Tentar recarregar conversas quando reconectar após um período
        if (connected && !isConnected) {
          const now = Date.now();
          if (now - lastUpdateTimestampRef.current > 300000) { // 5 minutos
            shouldRefreshRef.current = true;
            triggerRefresh();
          }
        }
      }
      
      // Se estiver em estado de falha permanente, mostrar erro
      if (connectionState === 'FAILED' && connectionError !== 'failed') {
        setConnectionError('failed');
        notificationService.notifyError({
          message: 'Não foi possível reconectar ao servidor. Tente recarregar a página.'
        });
      }
    };

    // Verificar imediatamente
    checkConnectionStatus();
    
    // Configurar verificação periódica do status de conexão
    const intervalId = setInterval(checkConnectionStatus, 10000); // Reduzido para 10 segundos
    
    return () => clearInterval(intervalId);
  }, [isConnected, connectionError, triggerRefresh]);

  // Configurar conexão e listeners em tempo real - APENAS UMA VEZ!
  useEffect(() => {
    if (!user || !userProfile) return;
    
    // Se já foi inicializado, evitar reinicialização
    if (globalState.isInitialized) {
      console.log('SocketContext já está inicializado. Ignorando.');
      return;
    }
    
    globalState.isInitialized = true;
    console.log('Inicializando SocketContext...');

    // Limpar qualquer estado de erro anterior
    setConnectionError(null);

    // Configurar serviço de tempo real com os dados do usuário
    try {
      console.log(`Inicializando comunicação em tempo real para usuário: ${userProfile.id} com papel: ${userProfile.role}`);
      
      // Inicializar com os dados do usuário
      realtimeService.setupForUser(socketURL, userProfile.id, userProfile.role, userProfile.setor);
      
      // Configurar listeners de evento
      const removeListeners = [
        // Evento de conexão
        realtimeService.on('connect', () => {
          console.log("Socket conectado com sucesso");
          setIsConnected(true);
          setConnectionError(null);
          
          // Carregar dados ao conectar se necessário
          if (conversations.length === 0) {
            shouldRefreshRef.current = true;
            triggerRefresh();
          }
        }),
        
        // Evento de desconexão
        realtimeService.on('disconnect', (reason) => {
          console.log("Socket desconectado:", reason);
          setIsConnected(false);
          
          // Notificar usuário sobre desconexão
          if (connectionError !== 'disconnected') {
            setConnectionError('disconnected');
            notificationService.notifyError({
              message: 'Conexão perdida. Reconectando...'
            });
          }
        }),
        
        // Evento de reconexão
        realtimeService.on('reconnect', (attempt) => {
          console.log(`Reconectado na tentativa ${attempt}`);
          setIsConnected(true);
          setConnectionError(null);
          
          // Recarregar dados após reconexão bem-sucedida
          refreshConversations();
        }),
        
        // Evento de falha na reconexão
        realtimeService.on('reconnect_failed', () => {
          console.log('Falha na reconexão após múltiplas tentativas');
          setConnectionError('failed');
          
          notificationService.notifyError({
            message: 'Não foi possível reconectar. Tente recarregar a página.'
          });
        }),
        
        // Nova conversa
        realtimeService.on(MultiFlowEventosMap.NOVA_CONVERSA, (data) => {
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
                
                // Adicionar ao início da lista e ordenar por data
                const updatedConversations = [conversaWithUnreadCount, ...prev];
                
                // Ordenar por última atividade (mais recentes primeiro)
                return updatedConversations.sort((a, b) => {
                  const aTime = new Date(a.ultimaAtividade || a.criadoEm || 0).getTime();
                  const bTime = new Date(b.ultimaAtividade || b.criadoEm || 0).getTime();
                  return bTime - aTime;
                });
              }
              return prev;
            });
          }
        }),
        
        // Nova mensagem
        realtimeService.on(MultiFlowEventosMap.NOVA_MENSAGEM, (data) => {
          console.log('Nova mensagem recebida:', data);
          
          // Atualizar timestamp da última atualização
          lastUpdateTimestampRef.current = Date.now();
          
          // Registrar timestamp da mensagem para esta conversa
          globalState.lastConversationUpdate[data.conversaId] = Date.now();
          
          // Verificar se é da conversa atual
          const isCurrentConversation = selectedConversationIdRef.current === data.conversaId;
          
          // Reproduzir som e enviar notificação
          notificationService.notifyNewMessage(data.mensagem, isCurrentConversation);
          
          // Indicar que há mensagens não lidas se a aplicação não estiver em foco
          if (!appFocusedRef.current) {
            setHasUnreadMessages(true);
          }
          
          // Limpar indicador de digitação para o remetente
          if (typingUsers[data.conversaId]) {
            setTypingUsers(prev => {
              const newState = {...prev};
              delete newState[data.conversaId];
              return newState;
            });
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
                
                // Se estiver em foco, marcar como lida imediatamente
                if (appFocusedRef.current) {
                  markMessageAsRead(data.conversaId, data.mensagem._id);
                }
                
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
          setConversations(prev => {
            // Primeiro atualizar a conversa existente
            const updatedConversations = prev.map(conv => {
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
            });
            
            // Verificar se a conversa existe
            const conversationExists = updatedConversations.some(c => c._id === data.conversaId);
            
            // Se não existir, precisamos adicionar
            if (!conversationExists) {
              // Buscar detalhes completos da conversa
              refreshConversations();
            } else {
              // Ordenar por última atividade
              return updatedConversations.sort((a, b) => {
                const aTime = new Date(a.ultimaAtividade || a.criadoEm || 0).getTime();
                const bTime = new Date(b.ultimaAtividade || b.criadoEm || 0).getTime();
                return bTime - aTime;
              });
            }
            
            return updatedConversations;
          });
        }),
        
        // Evento de digitação
        realtimeService.on(MultiFlowEventosMap.DIGITANDO, (data) => {
          // Ignorar eventos de digitação do próprio usuário
          if (data.userId === userProfile.id) return;
          
          setTypingUsers(prev => ({
            ...prev,
            [data.conversaId]: {
              userId: data.userId,
              nome: data.userName || 'Cliente'
            }
          }));
          
          // Limpar o status após 3 segundos sem atividade
          setTimeout(() => {
            setTypingUsers(prev => {
              // Só remover se ainda for o mesmo usuário
              if (prev[data.conversaId]?.userId === data.userId) {
                const newState = {...prev};
                delete newState[data.conversaId];
                return newState;
              }
              return prev;
            });
          }, 3000);
        }),
        
        // Conversa atualizada
        realtimeService.on(MultiFlowEventosMap.CONVERSA_ATUALIZADA, (data) => {
          console.log('Conversa atualizada:', data);
          
          // Atualizar timestamp da última atualização
          lastUpdateTimestampRef.current = Date.now();
          
          // Registrar timestamp da atualização para esta conversa
          if (data.conversa && data.conversa._id) {
            globalState.lastConversationUpdate[data.conversa._id] = Date.now();
          }
          
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
              
              // Se era a conversa selecionada, limpar seleção
              if (isCurrentConversation) {
                setSelectedConversation(null);
                selectedConversationIdRef.current = null;
              }
            } else {
              // Atualizar na lista de conversas ativas
              setConversations(prev => {
                // Verificar se a conversa já existe
                const exists = prev.some(c => c._id === data.conversa._id);
                
                if (exists) {
                  // Preservar contador de mensagens não lidas
                  const updatedConversations = prev.map(conv => {
                    if (conv._id === data.conversa._id) {
                      return {
                        ...data.conversa,
                        unreadCount: conv.unreadCount || 0,
                        lastMessageRead: conv.lastMessageRead
                      };
                    }
                    return conv;
                  });
                  
                  // Reordenar por última atividade
                  return updatedConversations.sort((a, b) => {
                    const aTime = new Date(a.ultimaAtividade || a.criadoEm || 0).getTime();
                    const bTime = new Date(b.ultimaAtividade || b.criadoEm || 0).getTime();
                    return bTime - aTime;
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
              
              // Atualizar a conversa selecionada se for a mesma
              if (isCurrentConversation) {
                setSelectedConversation(prev => {
                  if (!prev) return null;
                  
                  // IMPORTANTE: Manter as mensagens atualizadas!
                  const mergedMessages = data.conversa.mensagens || prev?.mensagens || [];
                  
                  // Se tivermos mensagens de ambas as fontes, combinar preservando ordem
                  if (prev?.mensagens && data.conversa.mensagens && 
                      prev.mensagens.length > 0 && data.conversa.mensagens.length > 0) {
                    // Criar um conjunto de IDs de mensagens para facilitar a verificação de duplicatas
                    const existingIds = new Set(prev.mensagens.map(m => m._id));
                    // Adicionar apenas novas mensagens
                    const newMessages = data.conversa.mensagens.filter(m => !existingIds.has(m._id));
                    
                    // Combinar preservando a ordem
                    return {
                      ...prev,
                      ...data.conversa,
                      mensagens: [...prev.mensagens, ...newMessages]
                    };
                  }
                  
                  return {
                    ...prev,
                    ...data.conversa,
                    mensagens: mergedMessages
                  };
                });
              }
            }
          }
        }),
        
        // Mensagem lida
        realtimeService.on(MultiFlowEventosMap.MENSAGEM_LIDA, (data) => {
          // Atualizar status de leitura para a mensagem
          if (selectedConversation && selectedConversation._id === data.conversaId) {
            setSelectedConversation(prev => {
              if (!prev) return null;
              
              const updatedMessages = prev.mensagens.map(msg => 
                msg._id === data.messageId ? 
                  { ...msg, read: true, readAt: data.timestamp } : 
                  msg
              );
              
              return {
                ...prev,
                mensagens: updatedMessages
              };
            });
          }
        }),
        
        // Erros
        realtimeService.on('error', (error) => {
          console.error('Erro no socket:', error);
          notificationService.notifyError({
            message: `Erro de conexão: ${error.message || 'Desconhecido'}`
          });
        })
      ];
      
      // Verificar conexão e atualizar estado
      setIsConnected(realtimeService.isConnected());
      
      // Carregar lista inicial de conversas
      shouldRefreshRef.current = true;
      triggerRefresh();
      
      // Limpar ao desmontar
      return () => {
        console.log('Desmontando SocketContext, limpando listeners e desconectando');
        removeListeners.forEach(removeListener => {
          if (typeof removeListener === 'function') {
            removeListener();
          }
        });
        
        // Desconectar
        realtimeService.disconnect();
        globalState.isInitialized = false;
      };
    } catch (error) {
      console.error('Erro ao inicializar comunicação em tempo real:', error);
      setConnectionError(`Falha ao conectar: ${error.message}`);
      
      // Notificar usuário sobre erro de conexão
      notificationService.notifyError({
        message: `Erro de conexão: ${error.message}`
      });
      
      // Carregar conversas usando a API REST como fallback
      shouldRefreshRef.current = true;
      triggerRefresh();
      
      // Limpar ao desmontar mesmo em caso de erro
      return () => {
        realtimeService.disconnect();
        globalState.isInitialized = false;
      };
    }
  }, [user, userProfile, socketURL, triggerRefresh, conversations.length]);

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
    console.log(`Selecionando conversa: ${conversationId}`);
    
    try {
      const userId = userProfile?.id || user?.uid;
      
      // Verificar se é a mesma conversa que já está selecionada
      if (selectedConversationIdRef.current === conversationId && selectedConversation) {
        console.log('Já na conversa selecionada, verificando se precisa atualizar');
        
        // Verificar se faz mais de 30 segundos desde a última atualização
        const now = Date.now();
        const lastUpdate = globalState.lastConversationUpdate[conversationId] || 0;
        if (now - lastUpdate > 30000) { // 30 segundos
          console.log('Conversa não atualizada recentemente, buscando dados do servidor');
          forceRefreshCurrentConversation();
        } else {
          console.log('Conversa atualizada recentemente, usando dados em cache');
        }
        
        // Marcar mensagens como lidas
        markMessagesAsRead(conversationId);
        
        return selectedConversation;
      }
      
      // Mostra temporariamente a versão em cache (se existir) para melhorar UX
      const cachedConversation = conversations.find(conv => conv._id === conversationId) || 
                                completedConversations.find(conv => conv._id === conversationId);
      
      if (cachedConversation) {
        console.log('Usando versão em cache temporariamente enquanto carrega dados atualizados');
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
      
      // Mostrar loading se não tivermos versão em cache
      if (!cachedConversation) {
        setIsLoading(true);
      }
      
      // Buscar detalhes da conversa pela API (sempre buscar dados frescos)
      console.log('Buscando dados atualizados da conversa do servidor...');
      const response = await multiflowApi.api.get(
        `/users/${userId}/conversas/${conversationId}`
      );
      
      if (response.data && response.data.success && response.data.data) {
        console.log('Detalhes da conversa recebidos do servidor');
        
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
        
        // Registrar momento da atualização
        globalState.lastConversationUpdate[conversationId] = Date.now();
        
        // Entrar na sala específica da conversa para receber atualizações
        if (userId) {
          realtimeService.joinRoom(`user_${userId}_conversa_${conversationId}`);
        }
        
        // Marcar mensagens como lidas
        markMessagesAsRead(conversationId);
        
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
    } finally {
      setIsLoading(false);
    }
  }, [user, userProfile, conversations, completedConversations, selectedConversation, forceRefreshCurrentConversation]);

  // Marcar uma mensagem específica como lida
  const markMessageAsRead = useCallback((conversationId, messageId) => {
    if (!conversationId || !messageId || !userProfile) return;
    
    try {
      // Enviar confirmação para o servidor
      multiflowApi.api.post(`/users/${userProfile.id}/conversas/${conversationId}/mensagens/${messageId}/read`);
      
      // Não precisamos esperar a resposta - otimista
    } catch (error) {
      console.error('Erro ao marcar mensagem como lida:', error);
    }
  }, [userProfile]);

  // Marcar todas as mensagens de uma conversa como lidas
  const markMessagesAsRead = useCallback((conversationId) => {
    if (!conversationId || !selectedConversation || !userProfile) return;
    
    try {
      // Enviar confirmação para o servidor
      multiflowApi.api.post(`/users/${userProfile.id}/conversas/${conversationId}/read`);
      
      // Atualizar localmente
      setConversations(prev => 
        prev.map(conv => 
          conv._id === conversationId
            ? { ...conv, unreadCount: 0, lastMessageRead: true }
            : conv
        )
      );
    } catch (error) {
      console.error('Erro ao marcar mensagens como lidas:', error);
    }
  }, [selectedConversation, userProfile]);

  // Enviar mensagem em uma conversa com tratamento otimizado para atualização em tempo real
  const sendMessage = useCallback(async (conversationId, text) => {
    try {
      console.log(`Enviando mensagem para conversa ${conversationId}:`, text);
      
      // Criar id único para mensagem otimista
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
      
      // Otimista: adicionar mensagem localmente antes da confirmação do servidor
      const optimisticMessage = {
        _id: tempId,
        conversaId: conversationId,
        conteudo: text.trim(),
        remetente: 'atendente',
        timestamp: new Date().toISOString(),
        status: 'sending',
        createdAt: new Date().toISOString()
      };
      
      // Armazenar para controle
      optimisticMessagesRef.current.set(tempId, optimisticMessage);
      
      // Adicionar à conversa atual se for a mesma
      if (selectedConversationIdRef.current === conversationId) {
        setSelectedConversation(prev => {
          if (!prev) return null;
          
          const updatedMessages = [...(prev.mensagens || []), optimisticMessage];
          console.log('Atualizando mensagens da conversa selecionada', updatedMessages.length);
          
          return {
            ...prev,
            mensagens: updatedMessages,
            ultimaAtividade: optimisticMessage.timestamp,
            ultimaMensagem: text.trim(),
            lastMessageRead: true
          };
        });
      }
      
      // Atualizar temporariamente na lista de conversas
      setConversations(prev => {
        const updatedConversations = prev.map(conv => 
          conv._id === conversationId
            ? { 
                ...conv, 
                ultimaMensagem: text.trim(),
                ultimaAtividade: optimisticMessage.timestamp,
                lastMessageRead: true
              }
            : conv
        );
        
        // Reordenar para colocar a conversa no topo
        return updatedConversations.sort((a, b) => {
          if (a._id === conversationId) return -1;
          if (b._id === conversationId) return 1;
          
          const aTime = new Date(a.ultimaAtividade || a.criadoEm || 0).getTime();
          const bTime = new Date(b.ultimaAtividade || b.criadoEm || 0).getTime();
          return bTime - aTime;
        });
      });
      
      // Registrar momento da atualização
      globalState.lastConversationUpdate[conversationId] = Date.now();
      
      // Enviar para o servidor
      const response = await multiflowApi.enviarMensagem(conversationId, text.trim());
      
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
              msg._id === tempId ? 
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
        
        // Remover da lista de mensagens otimistas
        optimisticMessagesRef.current.delete(tempId);
        
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
                msg._id === tempId ? 
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

  // Indicar que o usuário está digitando
  const sendTypingIndicator = useCallback((conversationId) => {
    if (!conversationId || !userProfile) return;
    
    // Evitar envio excessivo com debounce
    if (debounceTypingRef.current) {
      clearTimeout(debounceTypingRef.current);
    }
    
    debounceTypingRef.current = setTimeout(() => {
      // Enviar apenas se estiver conectado
      if (realtimeService.isConnected()) {
        realtimeService.sendTypingIndicator(conversationId);
      }
      debounceTypingRef.current = null;
    }, 300);
  }, [userProfile]);

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
        
        // Mostrar notificação de sucesso
        notificationService.showToast('Conversa transferida com sucesso', 'success');
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
        
        // Mostrar notificação de sucesso
        notificationService.showToast('Conversa finalizada com sucesso', 'success');
        
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
        
        // Mostrar notificação de sucesso
        notificationService.showToast('Conversa arquivada com sucesso', 'success');
        
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

  // Atualizar lista de conversas com debounce integrado
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
          const mergedConversations = [...newConversations, ...updatedExistingConversations];
          
          // Ordenar por última atividade
          setConversations(mergedConversations.sort((a, b) => {
            const aTime = new Date(a.ultimaAtividade || a.criadoEm || 0).getTime();
            const bTime = new Date(b.ultimaAtividade || b.criadoEm || 0).getTime();
            return bTime - aTime;
          }));
        } else {
          setConversations(conversasComStatus);
        }
        
        // Notificar sucesso
        notificationService.showToast('Conversas atualizadas', 'success');
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
    
    // Marcar mensagens como lidas na conversa atual
    if (selectedConversationIdRef.current) {
      markMessagesAsRead(selectedConversationIdRef.current);
    }
  }, [markMessagesAsRead]);
  
  // Testar recebimento de mensagens
  const testReceiveMessage = useCallback((conversationId, text = "Mensagem de teste simulada") => {
    if (!conversationId) {
      console.error('ID da conversa obrigatório para testar recebimento de mensagem');
      return;
    }
    
    console.log(`Simulando recebimento de mensagem na conversa ${conversationId}`);
    const mockMessage = realtimeService.simulateNewMessage(conversationId, text);
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
    testReceiveMessage, // Função para testar recebimento
    forceRefreshCurrentConversation, // Função para forçar atualização
    // Serviços
    api: multiflowApi,
    realtimeService,
    notificationService
  };

  // Disponibilizar o contexto para testes no console
  window.socketContext = value;

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};