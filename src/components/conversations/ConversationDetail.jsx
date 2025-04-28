import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Send, 
  MoreVertical, 
  ArrowLeftCircle, 
  UserCircle, 
  Archive, 
  Share, 
  CheckCircle, 
  MessageSquare, 
  RefreshCw,
  Paperclip,
  Smile,
  Phone,
  Video
} from 'lucide-react';

import { useSocket } from '../../contexts/SocketContext';
import MessageBubble from './MessageBubble';
import TypingIndicator from './TypingIndicator';
import { notificationService } from '../../services/notificationService';

// Componente de cabeçalho modernizado
const ConversationHeader = ({ 
  conversation, 
  onBack, 
  onAction, 
  onRefresh, 
  isRefreshing, 
  connectionStatus 
}) => {
  const [showOptions, setShowOptions] = useState(false);
  
  const nomeCliente = conversation?.nomeCliente || 'Cliente';
  const telefoneCliente = conversation?.telefoneCliente || '';
  const status = conversation?.status || '';
  
  // Obter status formatado
  const getStatusBadge = () => {
    const statusLower = status.toLowerCase();
    
    if (statusLower.includes('aguardando')) {
      return (
        <span className="text-amber-400 text-xs font-medium bg-amber-400/10 px-2 py-0.5 rounded-full">
          Aguardando
        </span>
      );
    } else if (statusLower.includes('andamento')) {
      return (
        <span className="text-green-400 text-xs font-medium bg-green-400/10 px-2 py-0.5 rounded-full">
          Em atendimento
        </span>
      );
    } else if (statusLower.includes('finalizada')) {
      return (
        <span className="text-blue-400 text-xs font-medium bg-blue-400/10 px-2 py-0.5 rounded-full">
          Finalizada
        </span>
      );
    }
    
    return null;
  };
  
  return (
    <div className="flex flex-col border-b border-gray-700 bg-gradient-to-r from-gray-800 to-gray-900 rounded-t-lg shadow-md">
      <div className="flex justify-between items-center p-3">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-700/50 text-gray-400 transition-colors lg:hidden"
            aria-label="Voltar"
          >
            <ArrowLeftCircle className="h-5 w-5" />
          </button>
          
          <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden text-white bg-gradient-to-br from-[#10b981] to-[#0d8e6a]">
            <UserCircle className="h-6 w-6" />
          </div>
          
          <div>
            <h3 className="text-white font-medium">{nomeCliente}</h3>
            <div className="text-xs flex items-center space-x-2">
              <span className="text-gray-400">{telefoneCliente}</span>
              {getStatusBadge()}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Indicador de conexão */}
          {connectionStatus === 'connected' ? (
            <span className="flex items-center text-xs text-green-400">
              <span className="w-2 h-2 rounded-full bg-green-400 mr-1"></span>
              Conectado
            </span>
          ) : connectionStatus === 'connecting' ? (
            <span className="flex items-center text-xs text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 mr-1 animate-pulse"></span>
              Conectando...
            </span>
          ) : (
            <span className="flex items-center text-xs text-red-400">
              <span className="w-2 h-2 rounded-full bg-red-400 mr-1"></span>
              Desconectado
            </span>
          )}
          
          {/* Ações */}
          <button 
            onClick={() => onAction('videoCall')}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-700/50 text-gray-400 transition-colors"
            title="Chamada de vídeo"
          >
            <Video className="h-4 w-4" />
          </button>
          
          <button 
            onClick={() => onAction('voiceCall')}
            className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-700/50 text-gray-400 transition-colors"
            title="Chamada de voz"
          >
            <Phone className="h-4 w-4" />
          </button>
          
          <button 
            onClick={onRefresh}
            disabled={isRefreshing}
            className={`h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-700/50 text-gray-400 transition-colors ${isRefreshing ? 'animate-spin opacity-50' : ''}`}
            title="Atualizar conversa"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setShowOptions(!showOptions)}
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-700/50 text-gray-400 transition-colors"
              aria-label="Mais opções"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
            
            {showOptions && (
              <div className="absolute right-0 top-full mt-1 z-10 w-56 bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
                <div className="p-2">
                  <button 
                    onClick={() => { setShowOptions(false); onAction('finalizar'); }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-700 text-gray-300 rounded text-sm flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4 text-[#10b981]" />
                    <span>Finalizar Conversa</span>
                  </button>
                  
                  <button 
                    onClick={() => { setShowOptions(false); onAction('transferir'); }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-700 text-gray-300 rounded text-sm flex items-center gap-2"
                  >
                    <Share className="h-4 w-4 text-blue-400" />
                    <span>Transferir</span>
                  </button>
                  
                  <button 
                    onClick={() => { setShowOptions(false); onAction('arquivar'); }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-700 text-gray-300 rounded text-sm flex items-center gap-2"
                  >
                    <Archive className="h-4 w-4 text-amber-400" />
                    <span>Arquivar</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Componente de entrada de mensagem modernizado
const MessageInput = React.memo(({ 
  onSubmit, 
  disabled, 
  onTyping 
}) => {
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const inputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  // Focar no input ao montar o componente
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);
  
  // Limpar timeout ao desmontar
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);
  
  // Detectar digitação
  const handleInputChange = (e) => {
    const text = e.target.value;
    setNewMessage(text);
    
    // Notificar digitação
    if (onTyping && text) {
      onTyping();
    }
  };
  
  // Ajustar altura do textarea dinamicamente
  const adjustTextareaHeight = () => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  };
  
  // Processar tecla Enter (enviar mensagem)
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
    
    // Ajustar altura em tempo real
    setTimeout(adjustTextareaHeight, 0);
  };
  
  // Enviar mensagem
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || disabled) return;
    
    onSubmit(newMessage);
    setNewMessage('');
    setShowEmojiPicker(false);
    
    // Resetar altura do textarea
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    
    // Focar no input novamente após enviar
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  };
  
  // Lista de emojis básicos
  const basicEmojis = ['😀', '😊', '😂', '👍', '❤️', '🙏', '👋', '⭐', '✅', '🔥', '🤔', '😢'];
  
  return (
    <form onSubmit={handleSubmit} className="flex gap-2 p-3 bg-gray-900 border-t border-gray-800">
      {/* Botão de anexo */}
      <button
        type="button"
        className="p-2 text-gray-400 hover:text-gray-200 hover:bg-gray-800 rounded-full transition-colors"
        disabled={disabled}
      >
        <Paperclip className="h-5 w-5" />
      </button>
      
      {/* Área de texto */}
      <div className="flex-1 relative">
        <textarea
          ref={inputRef}
          value={newMessage}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          placeholder="Digite sua mensagem..."
          rows="1"
          className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-4 py-2.5 pr-10 focus:outline-none focus:ring-2 focus:ring-[#10b981]/30 resize-none overflow-hidden"
          disabled={disabled}
          style={{ maxHeight: '120px' }}
        />
        
        {/* Botão de emoji */}
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
          <button
            type="button"
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="text-gray-400 hover:text-gray-200 p-1 rounded-full hover:bg-gray-700/50"
            disabled={disabled}
          >
            <Smile className="h-5 w-5" />
          </button>
          
          {/* Seletor de emoji */}
          {showEmojiPicker && (
            <div className="absolute bottom-full right-0 mb-2 bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-2 z-10">
              <div className="grid grid-cols-6 gap-1">
                {basicEmojis.map(emoji => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      setNewMessage(prev => prev + emoji);
                      inputRef.current?.focus();
                    }}
                    className="w-8 h-8 hover:bg-gray-700 rounded text-lg flex items-center justify-center"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Botão de envio */}
      <button
        type="submit"
        disabled={disabled || !newMessage.trim()}
        className="p-2.5 rounded-full bg-[#10b981] text-white hover:bg-[#0d8e6a] disabled:opacity-50 disabled:bg-[#10b981]/50 disabled:cursor-not-allowed transition-colors"
      >
        <Send className="h-5 w-5" />
      </button>
    </form>
  );
});

// Componente principal de conversa
const ConversationDetail = ({ 
  conversationId, 
  onBack, 
  isMobileView = false 
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  const messagesEndRef = useRef(null);
  const messageListRef = useRef(null);
  
  const { 
    selectedConversation, 
    selectConversation, 
    sendMessage, 
    finishConversation, 
    transferConversation,
    forceRefreshCurrentConversation,
    typingUsers,
    sendTypingIndicator,
    isConnected,
    archiveConversation
  } = useSocket();
  
  // Quando o ID da conversa muda, selecionar a conversa no Socket
  useEffect(() => {
    if (conversationId) {
      selectConversation(conversationId);
    }
  }, [conversationId, selectConversation]);

  // Rolar para o fim das mensagens quando elas mudam
  useEffect(() => {
    if (selectedConversation?.mensagens?.length) {
      scrollToBottom();
    }
  }, [selectedConversation?.mensagens?.length]);

  // Função para rolar para o fim das mensagens
  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Forçar atualização de conversa
  const handleRefresh = useCallback(() => {
    if (!forceRefreshCurrentConversation || isRefreshing) return;
    
    setIsRefreshing(true);
    
    forceRefreshCurrentConversation()
      .then(() => {
        notificationService.showToast('Conversa atualizada', 'success');
      })
      .catch(err => {
        console.error('Erro ao atualizar conversa:', err);
        notificationService.showToast('Erro ao atualizar conversa', 'error');
      })
      .finally(() => {
        setIsRefreshing(false);
      });
  }, [forceRefreshCurrentConversation, isRefreshing]);

  // Enviar mensagem
  const handleSendMessage = async (text) => {
    if (!text.trim() || isSubmitting || !selectedConversation) return;
    
    setIsSubmitting(true);
    
    try {
      // Atualizar scroll após enviar
      await sendMessage(selectedConversation._id, text.trim());
      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      notificationService.showToast('Erro ao enviar mensagem', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Manipular ações do menu
  const handleAction = useCallback((action) => {
    if (!selectedConversation) return;
    
    switch (action) {
      case 'finalizar':
        finishConversation(selectedConversation._id)
          .then(success => {
            if (success) {
              notificationService.showToast('Conversa finalizada com sucesso', 'success');
            }
          });
        break;
      case 'transferir':
        // Abrir modal para selecionar setor
        const targetSectorId = window.prompt("Digite o ID do setor de destino");
        if (targetSectorId) {
          transferConversation(selectedConversation._id, targetSectorId)
            .then(success => {
              if (success) {
                notificationService.showToast('Conversa transferida com sucesso', 'success');
              }
            });
        }
        break;
      case 'arquivar':
        archiveConversation(selectedConversation._id)
          .then(success => {
            if (success) {
              notificationService.showToast('Conversa arquivada com sucesso', 'success');
            }
          });
        break;
      default:
        break;
    }
  }, [selectedConversation, finishConversation, transferConversation, archiveConversation]);

  // Se não há conversa selecionada, mostrar mensagem
  if (!selectedConversation && !conversationId) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-gray-900 rounded-lg border border-gray-800">
        <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
          <MessageSquare className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-xl text-white font-medium mb-2">Selecione uma conversa</h3>
        <p className="text-gray-400 max-w-md">
          Escolha uma conversa da lista para visualizar as mensagens e interagir com o cliente.
        </p>
      </div>
    );
  }
  
  // Se está carregando a conversa
  if (conversationId && !selectedConversation) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-gray-900">
        <RefreshCw className="h-10 w-10 text-gray-400 animate-spin mb-4" />
        <p className="text-gray-400">Carregando conversa...</p>
      </div>
    );
  }

  // Extrair dados da conversa selecionada
  const messages = selectedConversation?.mensagens || [];
  const activeTyper = typingUsers?.[selectedConversation._id];
  const connectionStatus = isConnected ? 'connected' : connectionError ? 'disconnected' : 'connecting';

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-900 to-gray-950">
      {/* Cabeçalho */}
      <ConversationHeader 
        conversation={selectedConversation} 
        onBack={onBack}
        onAction={handleAction}
        onRefresh={handleRefresh}
        isRefreshing={isRefreshing}
        connectionStatus={connectionStatus}
      />

      {/* Lista de mensagens */}
      <div 
        className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent"
        ref={messageListRef}
      >
        {messages.length > 0 ? (
          <div className="space-y-1">
            {/* Renderizar mensagens */}
            {messages.map((message, index) => (
              <MessageBubble 
                key={message._id || `msg-${index}`}
                message={message}
                prevMessage={index > 0 ? messages[index - 1] : null}
                isGrouped={
                  index > 0 && 
                  messages[index - 1].remetente === message.remetente &&
                  new Date(message.timestamp) - new Date(messages[index - 1].timestamp) < 60000 // 1 minuto
                }
                isLastInGroup={
                  index < messages.length - 1 ? 
                  messages[index + 1].remetente !== message.remetente : true
                }
              />
            ))}
            
            {/* Indicador de digitação */}
            {activeTyper && (
              <TypingIndicator user={activeTyper} />
            )}
            
            {/* Elemento para referência de rolagem */}
            <div ref={messagesEndRef} />
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-6">
            <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mb-4">
              <MessageSquare className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-xl text-white font-medium mb-2">Conversa iniciada</h3>
            <p className="text-gray-400 max-w-md">
              Inicie a conversa enviando uma mensagem para {selectedConversation?.nomeCliente || 'o cliente'}.
            </p>
          </div>
        )}
      </div>

      {/* Campo de entrada de mensagem */}
      <MessageInput 
        onSubmit={handleSendMessage}
        disabled={isSubmitting || selectedConversation?.status === 'finalizada'}
        onTyping={() => sendTypingIndicator(selectedConversation?._id)}
      />
    </div>
  );
};

export default ConversationDetail;